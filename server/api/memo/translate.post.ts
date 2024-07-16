import prisma from "~/lib/db";

type DetailMemoReq = {
  id: any;
};

export default defineEventHandler(async (event) => {
  let { id } = (await readBody(event)) as DetailMemoReq;
    if (!id) {
        return {
        success: false,
        message: "id 不能为空",
        };
    }else{
        id = parseInt(id);
    }
  const data = await prisma.memo.findUnique({
    where:{
      id
    },
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
      },
      _count: {
        select:{
          comments:true
        }
      }
    },    
  });
  if(data && data.availableForProple !== '' && data.availableForProple !== null){
    const info = data.availableForProple.split(',');
    if(info.includes('#'+event.context.userId+'$')) {
      return {
        data,
        success: true,
      };
    }else{
        return {
            success: false,
            message: "401 Unauthorized 未授权查看该内容，请登陆或者联系作者获取权限",
        };
    }
  }
  // data中的内容翻译成中/英文
    if(data && data.content){
        const res = await fetch(`https://translate.api.randallanjie.com/?text=${data.content}`);
        const result = await res.json();
        if(result && result.response && result.response.translated_text){
            data.content = result.response.translated_text;
        }
    }
  return {
    data,
    success: true,
  };
});
