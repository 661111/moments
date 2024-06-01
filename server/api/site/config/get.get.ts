import prisma from "~/lib/db";

export default defineEventHandler(async (event) => {

    const url = new URL(event.req.url, `http://${event.req.headers.host}`);
    const params = new URLSearchParams(url.search);
    const geteventnotification = params.get('geteventnotification');
    const email = params.get('email');



    let data = await prisma.config.findUnique({
        where: {
            id: 1,
        },
    });
    let notifications = await prisma.notification.findMany({
        where: {
            type: 2,
        },
    })

    // 取第一个通知
    let notification = notifications[0];


    if(!data){
        throw new Error("Info not found");
    }
    if(event.context.userId == 1){
        data = {
            notification,
            ...data
        }
    }else{
        data = {
            notification,
            enableS3: data.enableS3,
            enableRecaptcha: data.enableRecaptcha,
            recaptchaSiteKey: data.recaptchaSiteKey,
            enableTencentMap: data.enableTencentMap,
            tencentMapKey: data.tencentMapKey,
        }
    }
    if(event.context.userId){
        const notificationRecord = await prisma.notification.findMany({
            where: {
                type: 1,
                send_to_user_id: event.context.userId,
            },
        });
        if(notificationRecord){
            data = {notificationRecord , ...data}
            await prisma.notification.updateMany({
                where: {
                    type: 1,
                    send_to_user_id: event.context.userId,
                },
                data: {
                    type: 0,
                },
            });
        }
    }else if(geteventnotification&&email){
        const notificationRecord = await prisma.notification.findMany({
            where: {
                type: 1,
                send_to_email: email,
            },
        });
        if(notificationRecord){
            data = {notificationRecord , ...data}
            await prisma.notification.updateMany({
                where: {
                    type: 1,
                    send_to_email: email,
                },
                data: {
                    type: 0,
                },
            });
        }
    }
    return {
        success: true,
        data: data
    }
});
