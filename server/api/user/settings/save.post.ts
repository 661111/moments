import prisma from "~/lib/db";
import bcrypt from "bcrypt";
import redis from "~/services/redisService";

type SaveSettingsReq = {
  username?: string,
  eMail?: string,
  newEMail?: string,
  password?: string,
  nickname?: string,
  slogan?: string,
  avatarUrl?: string,
  coverUrl?: string,
  css?: string,
  js?: string,
  eMailVerificationCode?: string,
};

export default defineEventHandler(async (event) => {
  const {username,  password, nickname, avatarUrl, slogan, coverUrl, newEMail, eMailVerificationCode,  ...rest } =
    (await readBody(event)) as SaveSettingsReq;

  let mailChange = false;

  const updated = {} as SaveSettingsReq;

  const userId = event.context.userId;


  if (password) updated.password = bcrypt.hashSync(password, 10);
  updated.nickname = nickname || "无名侠士";
  updated.avatarUrl = avatarUrl || '/avatar.webp'
  updated.slogan = slogan || "星垂平野阔，月涌大江流。";
  updated.coverUrl = coverUrl || '/cover.webp';

  // 从updated中获取剩余的数据
  const data = { ...updated, ...rest };

  if(username){
    const userExist = await prisma.user.findFirst({
      where: {
        username: username,
        id: {
            not: userId,
        }
      },
    });
    if (userExist) {
      return {
        success: false,
        message: "用户名已存在",
      };
    }
    data.username = username;
  }

  if(newEMail){
    mailChange = true;
    const exitUser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!exitUser) {
      return {
        success: false,
        message: "用户不存在",
      };
    }else{
        if(exitUser.eMail === newEMail){
            return {
            success: false,
            message: "新邮箱与旧邮箱相同",
            };
        }
    }
    const exitMail = await prisma.user.findFirst({
      where: {
        eMail: newEMail,
      },
    });
    if (exitMail) {
      return {
        success: false,
        message: "邮箱已存在",
      };
    }
  }

    if (mailChange) {
      if (!eMailVerificationCode) {
        return {
            success: false,
            message: "请输入验证码",
        };
      }
      const verificationCode = await redis.get('changeEmail'+newEMail);
      if (!verificationCode) {
        return {
            success: false,
            message: "验证码错误",
        };
      }
      if (verificationCode !== eMailVerificationCode) {
        return {
          success: false,
          message: "验证码错误",
        };
      }else{
        await redis.del('changeEmail'+newEMail);
        data.eMail = newEMail;
      }
    }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
        username: data.username,
        eMail: data.eMail,
        nickname: data.nickname,
        password: data.password,
        avatarUrl: data.avatarUrl,
        slogan: data.slogan,
        coverUrl: data.coverUrl,
        css: data.css,
    },
  });

  return {
    success: true,
  };

});
