import prisma from "~/lib/db";
import { sendEmail } from '~/utils/sendEmail';
import {fa} from "cronstrue/dist/i18n/locales/fa";
import redis from '~/services/redisService';

type sendMailReq = {
    email: string;
    action: string;
};

export default defineEventHandler(async (event) => {
    let {email, action} = (await readBody(event)) as sendMailReq;
    let userid = 0;

    if (action == 'resetPassword'){
        const user = await prisma.user.findFirst({
            where: {
                username: email,
            },
        });
        if (user && user.eMail) {
            email = user.eMail;
            userid = user.id;
        } else {
            const user = await prisma.user.findFirst({
                where: {
                    eMail: email,
                },
            });
            if (user && user.eMail) {
                email = user.eMail;
                userid = user.id;
            } else {
                // 等待随机2秒到8秒，防止定时攻击
                await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 6000) + 2000));
                return { success: true, message: '如果您的登陆名/邮箱存在于我们的数据库中，我们将发送一封邮件到您的邮箱，请注意查收' };
            }
        }
    }

    if(await redis.get(action+email)){
        return { success: false, message: '上一条验证码还未过期，请五分钟后再试' };
    }

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

    // 生成验证码
    let verificationCode = await generateVerificationCode();

    let sendMailTemplate = `您的验证码是：${verificationCode}，五分钟内有效，五分钟内请勿重新尝试发送。`;

    // 判断参数是否正确
    if(!['register','resetPassword','changeEmail'].includes(action)){
        return {
            success: false,
            message: "参数错误",
        };
    }

    const title = await prisma.config.findUnique({
        where: {
            id: 1,
        },
        select: {
            title: true,
            siteUrl: true,
        },
    });

    if(action == 'register'){
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
        const emailRegistrationContent = await prisma.systemConfig.findFirst({
            where: {
                key: 'emailRegistrationContent',
            },
        });
        if(emailRegistrationContent && emailRegistrationContent.value && emailRegistrationContent.value !== ''){
            sendMailTemplate = emailRegistrationContent.value;
        }
    }else if(action == 'resetPassword'){
        const emailResetContent = await prisma.systemConfig.findFirst({
            where: {
                key: 'emailResetContent',
            },
        });
        if(emailResetContent && emailResetContent.value && emailResetContent.value !== ''){
            sendMailTemplate = emailResetContent.value;
        }
        sendMailTemplate = sendMailTemplate.replaceAll('{Code}', title.siteUrl + '/user/recovery/' + userid + '?v=' + verificationCode);
    }else if(action == 'changeEmail'){
        const emailChangeContent = await prisma.systemConfig.findFirst({
            where: {
                key: 'emailChangeContent',
            },
        });
        if(emailChangeContent && emailChangeContent.value && emailChangeContent.value !== ''){
            sendMailTemplate = emailChangeContent.value;
        }
    }

    // 从数据库中读取title
    sendMailTemplate = sendMailTemplate.replaceAll('{Code}', verificationCode);
    sendMailTemplate = sendMailTemplate.replaceAll('{Email}', email);
    sendMailTemplate = sendMailTemplate.replaceAll('{Site}', title.title==null?'moments':title.title);
    sendMailTemplate = sendMailTemplate.replaceAll('{Url}', title.siteUrl==null?(new URL(event.req.url, `http://${event.req.headers.host}`).origin):title.siteUrl);

    const sendData = {
        email: email,
        subject: title.title==='undefined'?'验证码':title.title+'验证码',
        message: sendMailTemplate,
    };
    const returns = await sendEmail(sendData);
    if(returns.success){
        await redis.set(action+email, verificationCode, 'EX', 5 * 60);
        return { success: true, message: '验证码已发送至您的邮箱，验证码五分钟内有效，请注意查收' };
    }else{
        return { success: false, message: '验证码发送失败，请检查邮箱是否正确，或当前邮件服务异常稍后再试', error: returns.error};
    }


});



async function generateVerificationCode() {
    const length = 6;
    const systemConfig = await prisma.systemConfig.findFirst({
        where: {
            key: 'mailVerificationCodeType',
        },
    });
    let codeType = 1;
    if (systemConfig) {
        codeType = parseInt(systemConfig.value);
    }
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if(codeType == 1){
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }else if(codeType == 2){
        chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    }else if(codeType == 3){
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    }else if(codeType == 4){
        chars = 'abcdefghijklmnopqrstuvwxyz';
    }else if(codeType == 5){
        chars = '0123456789';
    }
    let code = '';

    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}
