import prisma from "~/lib/db";
import {context} from "esbuild";

type ListMemoReq = {
  user: any;
  tagname: any;
  searchname: any;
  page: number;
};

export default defineEventHandler(async (event) => {
  let { user, page, tagname, searchname } = (await readBody(event)) as ListMemoReq;
  user = parseInt(user);
  if (user) {
    const userExist = await prisma.user.findUnique({
      where: {
        id: user,
      },
    });
    if (!userExist) {
      user = undefined;
    }
  }
  const size = 10;
  let data = [];
  if(user){
    data = await prisma.memo.findMany({
      include: {
        user: {
          select: {
            username: true,
            nickname: true,
            slogan: true,
            id: true,
            avatarUrl: true,
            coverUrl: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          take: 5+1
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      where: {
        userId: user,
        OR: [
          {
            availableForProple: null,
          },
          {
            availableForProple: '',
          },
          {
            availableForProple: {
              contains: `#${event.context.userId}$`,
            },
          },
        ],
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * size,
      take: size,
    });
  }else{
    // 第一个查询
    const data1 = await prisma.memo.findMany({
      include: {
        user: {
          select: {
            username: true,
            nickname: true,
            slogan: true,
            id: true,
            avatarUrl: true,
            coverUrl: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          take: 5+1
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      where: {
        userId: 1,
        pinned: true,
        content: {
          contains: tagname? '#'+tagname: (searchname? searchname: ''),
        },
        OR: [
          {
            availableForProple: null,
          },
          {
            availableForProple: '',
          },
          {
            availableForProple: {
              contains: `#${event.context.userId}$`,
            },
          },
        ],
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
    });

// 第二个查询
    const data2 = await prisma.memo.findMany({
      include: {
        user: {
          select: {
            username: true,
            nickname: true,
            slogan: true,
            id: true,
            avatarUrl: true,
            coverUrl: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          take: 5+1
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      where: {
        OR: [
          {
            availableForProple: null,
          },
          {
            availableForProple: '',
          },
          {
            availableForProple: {
              contains: `#${event.context.userId}$`,
            },
          },
        ],
        NOT: [
          {
            userId: 1,
            pinned: true,
          },
        ],
        content: {
          contains: tagname? '#'+tagname: (searchname? searchname: ''),
        },
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
    });

    data = data1.concat(data2).slice((page - 1) * size, page * size);
  }

  data = data.map(memo => ({
    ...memo,
    comments: memo.comments.filter(comment => comment.content && comment.content.length < 100),
    hasMoreComments: memo._count.comments > 5 || memo.comments.some(comment => comment.content && comment.content.length >= 100),
    avpeople: (memo.availableForProple ? memo.availableForProple.split(",").map(item => item.split("#")[1].split("$")[0]) : []).join(','),
  }));
  // 截取前5条评论
  data = data.map(memo => ({
    ...memo,
    comments: memo.comments.slice(0, 5),
  }));
  const total = await prisma.memo.count({
    where: {
      userId: user ? user : undefined,
      content: {
        contains: tagname? '#'+tagname: (searchname? searchname: ''),
      },
      OR: [
        {
          availableForProple: null,
        },
        {
          availableForProple: '',
        },
        {
          availableForProple: {
            contains: `#${event.context.userId}$`,
          },
        },
      ],
    },
  });
  const totalPage = Math.ceil(total / size);
  return {
    data,
    hasNext: page < totalPage,
    success: true,
  };
});
