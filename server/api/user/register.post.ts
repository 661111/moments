import prisma from "~/lib/db";
import bcrypt from "bcrypt";
import redis from '~/services/redisService';

type registerReq = {
    username: string;
    email: string;
    password: string;
    emailVerificationCode: string;
};

export default defineEventHandler(async (event) => {
    const {username, email, password, emailVerificationCode} = (await readBody(event)) as registerReq;

    if (!email) {
        return {
            success: false,
            message: "邮箱不能为空",
        };
    }else if(!/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(email)){
        return {
            success: false,
            message: "邮箱格式不正确",
        };
    }

    if (!username) {
        return {
            success: false,
            message: "用户名不能为空",
        };
    }

    if (!password) {
        return {
            success: false,
            message: "密码不能为空",
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

    if (!emailVerificationCode) {
        return {
            success: false,
            message: "验证码不能为空",
        };
    }

    const systemConfig = await prisma.systemConfig.findFirst({
        where: {
            key: 'enableRegister',
        },
    });
    if(!systemConfig || systemConfig.value !== '1'){
        return {
            success: false,
            message: "站点未开启注册",
        };
    }

    // 从数据库中读取验证码
    const retrievedCode = await redis.get('register'+email);
    if(retrievedCode === null){
        return {
            success: false,
            message: '验证码错误',
        };
    }
    if (retrievedCode !== emailVerificationCode) {
        return {
            success: false,
            message: '验证码错误',
        };
    }

    // 检查邮箱是否已经注册
    const user = await prisma.user.findFirst({
        where: {
            eMail: email,
        },
    });
    if(user){
        return { success: false, message: '该邮箱已经注册' };
    }

    // 检查用户名是否已经注册
    const user2 = await prisma.user.findFirst({
        where: {
            username: {
                contains: username,
            },
        },
    });
    if(user2){
        return { success: false, message: '用户名已经注册' };
    }
    // 创建用户
    await prisma.user.create({
        data: {
            username: username,
            nickname: username,
            eMail: email,
            avatarUrl: '/avatar.webp',
            coverUrl: '/cover.webp',
            slogan: '这个人很懒，什么都没有留下',
            password: bcrypt.hashSync(password, 10),
            enableS3: false,
        },
    });

    // 删除验证码
    await redis.del(email);

    return {
        success: true,
    };

});