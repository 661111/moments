import prisma from "~/lib/db";
import bcrypt from "bcrypt";
import redis from '~/services/redisService';

type registerReq = {
    user: string;
    password: string;
    emailVerificationCode: string;
};

export default defineEventHandler(async (event) => {
    const {user, password, emailVerificationCode} = (await readBody(event)) as registerReq;

    if(!user || !password || !emailVerificationCode){
        return {
            success: false,
            message: '参数错误',
        };
    }

    if (password.length < 6) {
        return {
            success: false,
            message: "密码长度不能小于6位",
        };
    }

    if (password.length > 20) {
        return {
            success: false,
            message: "密码长度不能大于20位",
        };
    }

    const tmpuser = await prisma.user.findUnique({
        where: {
            id: parseInt(user)
        },
    });
    let email = '';
    if (!tmpuser || !tmpuser.eMail) {
        return {
            success: false,
            message: "用户不存在或者邮箱未绑定",
        };
    } else {
        email = tmpuser.eMail;
    }

    // 从数据库中读取验证码
    const retrievedCode = await redis.get('resetPassword'+email);
    if ((retrievedCode === null) || (retrievedCode !== emailVerificationCode)) {
        console.log('retrievedCode:', retrievedCode, 'emailVerificationCode:', emailVerificationCode)
        return {
            success: false,
            message: '验证码错误或过期',
        };
    }

    await prisma.user.update({
        where: {
            id: parseInt(user),
        },
        data: {
            password: bcrypt.hashSync(password, 10),
        },
    });

    // 删除验证码
    await redis.del(email);

    return {
        success: true,
    };

});