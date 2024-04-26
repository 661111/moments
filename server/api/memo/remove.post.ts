import prisma from "~/lib/db";
import fs from "fs/promises";

type RemoveCommentReq = {
  memoId: number;
};

export default defineEventHandler(async (event) => {
  const { memoId } = (await readBody(event)) as RemoveCommentReq;

  const memo = await prisma.memo.findUnique({
    where: {
      id: memoId,
    },
  });
  if(memo && (memo?.userId !== event.context.userId)){
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
  await prisma.memo.delete({
    where: {
      id: memoId,
    },
  });

  if (memo && memo.imgs) {
    memo.imgs.split(",").forEach(async (img) => {
      if(img.startsWith('/upload')){
        try {
          await fs.rm(`${process.env.UPLOAD_DIR}/${img.replaceAll('/upload/','')}`);
        } catch (e) {
          console.log("RM file error is : ", e);
        }
      }      
    });
  }
  return {
    success: true,
  };
});
