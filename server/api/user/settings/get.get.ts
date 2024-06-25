import prisma from "~/lib/db";

type GetSettingReq = {
  user?: string;
};

export default defineEventHandler(async (event) => {
  const url = new URL(event.req.url, `http://${event.req.headers.host}`);
  const params = new URLSearchParams(url.search);

  const paramUser = params.get('user');



  // 获取用户 ID，如果没有提供则默认为 1
  let userId = 1;

    if (paramUser && /^\d+$/.test(paramUser)) {
        userId = parseInt(paramUser);
    }

  if (!userId || userId < 1) {
    userId = event.context.userId;
  }

  userId = userId ? userId : 1;

  let userData = null
  if(event.context.userId !== userId) {
    userData = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        nickname: true,
        avatarUrl: true,
        slogan: true,
        coverUrl: true,
        css: true,
      },
    });
    if(userData){
      userData.personalCss = userData.css?userData.css:'';
      delete userData.css;
    }
  }else{
    userData = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        nickname: true,
        avatarUrl: true,
        slogan: true,
        coverUrl: true,
        eMail: true,
        css: true,
      },
    });
    if(userData){
      userData.personalCss = userData.css?userData.css:'';
      delete userData.css;
    }
  }
  let configData = await prisma.config.findUnique({
    where: {
      id: 1,
    },
    select: {
      favicon: true,
      title: true,
      css:true,
      js:true,
      beianNo:true,
    },
  });
  if (!userData || !configData) {
    if(!userData && userId == 1){
      // 新数据库，初始化数据
      const initData = {
        username: "admin",
        nickname: "admin",
        password: "$2b$10$F56fAwmRR9hBPXhPjVMLtusMgC7Gxp5VzTiWSXl28InVMgTpm2fYK",
        avatarUrl: "/avatar.webp",
        slogan: "这个人很懒，什么都没有留下",
        coverUrl: "/cover.webp",
        createdAt: new Date(),
        updatedAt: new Date(),
        enableS3: false,
        title: "admin",
        eMail: "example@randallanjie.com",
      }
      await prisma.user.create({
        data: initData,
      });
      userData = await prisma.user.findUnique({
        where: {
          id: 1,
        },
        select: {
          nickname: true,
          avatarUrl: true,
          slogan: true,
          coverUrl: true,
          eMail: true,
        },
      });
    }
    if(!configData){
        // 新数据库，初始化数据
        const initData = {
          enableS3: false,
          favicon: "/favicon.ico",
          title: "Randall的小屋",
          css: "",
          js: "",
          beianNo: "",
        }
        await prisma.config.create({
          data: initData,
        });
        configData = await prisma.config.findUnique({
          where: {
            id: 1,
          },
          select: {
            favicon: true,
            title: true,
            css:true,
            js:true,
            beianNo:true,
          },
        });
    }
    if(userId !== 1){
      throw new Error("User not found");
    }
  }
  let systemConfigData = await prisma.systemConfig.findMany({
    where: {
      type: 1,
    },
  });
  const data = {
    ...userData,
    ...configData,
    "isadmin": event.context.userId === 1,
    ...Object.fromEntries(systemConfigData.map((item) => [item.key, item.value])),
  };

  return {
    success: true,
    data: data,
  };
});
