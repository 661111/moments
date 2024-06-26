import prisma from "~/lib/db";
import { readBody } from "h3";
import { sendEmail } from '~/utils/sendEmail';
import { aliTextJudge } from '~/utils/aliTextJudge';


// 定义评论请求的数据类型
type SaveCommentReq = {
    memoId: number;
    content: string;
    replyTo?: string;
    replyToId?: number;
    email?: string;
    website?: string;
    username: string;
    author: number;
    reToken: string;
};

const siteConfig = await prisma.config.findUnique({
    where: {
        id: 1,
    },
});

let siteUrl = siteConfig?.siteUrl;
if(siteUrl === undefined || siteUrl === null || siteUrl === '' || siteUrl === 'undefined' || siteUrl === 'null'){
    siteUrl = '';
}
if(siteUrl.endsWith('/')){
    siteUrl = siteUrl.slice(0, -1);
}

const staticWord = {
    'ad': '广告引流',
    'political_content': '涉政内容',
    'profanity': '辱骂内容',
    'contraband': '违禁内容',
    'sexual_content': '色情内容',
    'violence': '暴恐内容',
    'nonsense': '无意义内容',
    'negative_content': '不良内容',
    'religion': '宗教内容',
    'cyberbullying': '网络暴力',
    'ad_compliance': '广告法合规',
    'C_customized': '违反本站规定',
}

export default defineEventHandler(async (event) => {
    // 从请求体中读取数据
    let { memoId, content, replyTo, replyToId, username, email, website, reToken } =
        (await readBody(event)) as SaveCommentReq;

    if (content.length > 500) {
        return { success: false, message: "评论内容长度不能超过500个字符",};
    }
    if (username.length > 10) {
        return { success: false, message: "用户名长度不能超过10个字符" };
    }
    if (email && email.length > 30) {
        return { success: false, message: "邮箱长度不能超过30个字符" };
    }
    if (website && website.length > 100) {
        return { success: false, message: "网址长度不能超过100个字符" };
    }
    if (email && !/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(email)) {
        return { success: false, message: "邮箱格式不正确" };
    }
    if (website && !/^(https?:\/\/)?[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(website)) {
        return { success: false, message: "网址格式不正确" };
    }


    if(siteConfig !== null && siteConfig?.enableRecaptcha && siteConfig?.recaptchaSiteKey !== '' && siteConfig?.recaptchaSecretKey !== ''){
        // 验证 reCAPTCHA 响应
        const recaptchaResult = await validateRecaptcha(reToken);
        if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
            return {
                success: false,
                message: "reCAPTCHA failed: " + recaptchaResult["error-codes"].join(", ")
            };
        }
    }

    // 文本内容检查
    if(siteConfig !== null && siteConfig?.enableAliyunDective && siteConfig?.aliyunAccessKeyId !== '' && siteConfig?.aliyunAccessKeySecret !== '' && event.context.userId !== 1){
        const aliJudgeResponse1 = await aliTextJudge(content, 'comment_detection', siteConfig?.aliyunAccessKeyId||"", siteConfig?.aliyunAccessKeySecret||"");
        if (aliJudgeResponse1.Data && aliJudgeResponse1.Data.labels && aliJudgeResponse1.Data.labels !== '') {
            let labelsList = aliJudgeResponse1.Data.labels.split(',');

            return {
                success: false,
                message: "评论内容不符合规范：" + labelsList.map((label: string) => staticWord[label]).join(', '),
            };
        }

        const aliJudgeResponse2 = await aliTextJudge(username, 'nickname_detection', siteConfig?.aliyunAccessKeyId||"", siteConfig?.aliyunAccessKeySecret||"");
        if (aliJudgeResponse2.Data && aliJudgeResponse2.Data.labels && aliJudgeResponse2.Data.labels !== '') {
            let labelsList = aliJudgeResponse2.Data.labels.split(',');

            return {
                success: false,
                message: "用户名不符合规范：" + labelsList.map((label: string) => staticWord[label]).join(', '),
            };
        }

    }

    // 根据memoId查找memo的作者
    const memo = await prisma.memo.findUnique({
        where: {
            id: memoId,
        },
        select: {
            content: true,
            userId: true,
            atpeople: true,
        },
    });
    // 根据id获取nickname
    if(event.context.userId){
        const user = await prisma.user.findUnique({
            where: {
                id: event.context.userId,
            },
            select: {
                nickname: true,
                eMail: true,
            },
        });
        if(user){
            username = user.nickname || username;
            email = user.eMail || email;
        }
    }

    // 创建评论
    await prisma.comment.create({
        data: {
            content,
            replyTo,
            memoId,
            username,
            email,
            website,
            author: event.context.userId !== undefined? (event.context.userId === memo?.userId? 1: 2): 0,
            replyToUser: replyToId || 0,
            linkedUser: event.context.userId || 0,
            replyToId: replyToId || 0,
        },
    });
    if(siteConfig){
        let notificationList: any[] = [];
        notificationList.push(email || '');
        let comment = null;

        if(replyToId !== undefined && replyToId !== 0){
            comment = await prisma.comment.findUnique({
                where: {
                    id: replyToId,
                }
            });
            if(comment !== null && comment.email !== null && comment.email !== '' && notificationList.indexOf(comment.email) === -1){
                notificationList.push(comment.email);
                await prisma.notification.create({
                    data: {
                        type: 1,
                        send_from: event.context.userId || 0,
                        send_to_user_id: comment.linkedUser || 0,
                        send_to_email: comment.email,
                        linked_memo: memoId,
                        message: `用户 ${username} 回复了您，他回复道: ${content}`,
                    },
                });
                let tmpmsg = `您在moments中的评论有新回复！用户名为:  ${username} 回复了您的评论(${comment.content})，他回复道: ${content}，点击查看: ${siteUrl}/detail/${memoId}`;
                const emailNewReplyCommentNotification = await prisma.systemConfig.findFirst({
                    where: {
                        key: 'emailNewReplyCommentNotification',
                    },
                });
                if(emailNewReplyCommentNotification && emailNewReplyCommentNotification.value && emailNewReplyCommentNotification.value !== ''){
                    tmpmsg = emailNewReplyCommentNotification.value;
                }
                tmpmsg = tmpmsg.replaceAll('{Sitename}', siteConfig?.title)
                    .replaceAll('{SiteUrl}', siteUrl)
                    .replaceAll('{MemoUrl}', `${siteUrl}/detail/${memoId}`)
                    .replaceAll('{Nickname}', username)
                    .replaceAll('{Content}', content)
                    .replaceAll('{OriginalContent}', comment.content || '')
                    .replaceAll('{Memo}', memo?.content || '');
                // 邮箱通知被回复者
                if(siteConfig?.enableEmail){
                    sendEmail({
                        email: comment.email,
                        subject: '新回复',
                        message: tmpmsg,
                    });
                }

            }
        }
        if(memo?.atpeople && memo?.atpeople !== ''){
            const atpeople = memo?.atpeople?.split(',');
            for (const item of atpeople) {
                const userat = await prisma.user.findUnique({
                    where: {
                        id: parseInt(item),
                    },
                });
                if(userat && userat.eMail && userat.eMail !== '' && notificationList.indexOf(userat.eMail) === -1){
                    await prisma.notification.create({
                        data: {
                            type: 1,
                            send_from: event.context.userId || 0,
                            send_to_user_id: parseInt(item),
                            send_to_email: userat.eMail,
                            linked_memo: memoId,
                            message: `用户 ${username} 在提及了您的动态中发表了评论，他说: ${content}`,
                        },
                    });
                    if(siteConfig?.enableEmail){
                        let tmpmsg = `有一条新提及您的动态！用户名为:  ${username} 的用户在提及了您的动态中发表了评论，他说: ${content}，点击查看: ${siteUrl}/detail/${memoId}`;
                        const emailNewMentionCommentNotification = await prisma.systemConfig.findFirst({
                            where: {
                                key: 'emailNewMentionCommentNotification',
                            },
                        });
                        if(emailNewMentionCommentNotification && emailNewMentionCommentNotification.value && emailNewMentionCommentNotification.value !== ''){
                            tmpmsg = emailNewMentionCommentNotification.value;
                        }
                        tmpmsg = tmpmsg.replaceAll('{Sitename}', siteConfig?.title)
                            .replaceAll('{SiteUrl}', siteUrl)
                            .replaceAll('{MemoUrl}', `${siteUrl}/detail/${memoId}`)
                            .replaceAll('{Nickname}', username)
                            .replaceAll('{Content}', content)
                            .replaceAll('{Memo}', memo?.content || '');
                        sendEmail({
                            email: userat.eMail,
                            subject: '新提及',
                            message: tmpmsg,
                        });
                    }
                }
            }
        }

        const user = await prisma.user.findUnique({
            where: {
                id: memo?.userId,
            },
            select: {
                eMail: true,
            },
        });
        if(user && user.eMail && user.eMail !== '' && notificationList.indexOf(user.eMail) === -1){
            await prisma.notification.create({
                data: {
                    type: 1,
                    send_from: event.context.userId || 0,
                    send_to_user_id: memo?.userId || 0,
                    send_to_email: user.eMail,
                    linked_memo: memoId,
                    message: `用户 ${username} 在您的moment中发表了评论: ${content}`,
                },
            });
            if(siteConfig?.enableEmail){
                let tmpmsg = `您的moments有新评论！用户名为:  ${username} 在您的moment中发表了评论: ${content}，点击查看: ${siteUrl}/detail/${memoId}`;
                const emailNewCommentNotification = await prisma.systemConfig.findFirst({
                    where: {
                        key: 'emailNewCommentNotification',
                    },
                });
                if(emailNewCommentNotification && emailNewCommentNotification.value && emailNewCommentNotification.value !== ''){
                    tmpmsg = emailNewCommentNotification.value;
                }
                tmpmsg = tmpmsg.replaceAll('{Sitename}', siteConfig?.title)
                    .replaceAll('{SiteUrl}', siteUrl)
                    .replaceAll('{MemoUrl}', `${siteUrl}/detail/${memoId}`)
                    .replaceAll('{Nickname}', username)
                    .replaceAll('{Content}', content)
                    .replaceAll('{Memo}', memo?.content || '');
                sendEmail({
                    email: user.eMail || process.env.NOTIFY_MAIL || '',
                    subject: '新评论',
                    message: tmpmsg,
                });
            }

        }
    }
    // 返回成功响应
    return {
        success: true,
    };
});

// reCAPTCHA 验证函数
async function validateRecaptcha(reToken: string) {
    try {
        const response = await fetch('https://recaptcha.net/recaptcha/api/siteverify', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `secret=${siteConfig?.recaptchaSecretKey || ''}&response=${reToken}`
        });
        return await response.json();
    } catch (error) {
        console.error("Failed to verify reCAPTCHA:", error);
        return { success: false, "error-codes": ["verification_failed"] };
    }
}
