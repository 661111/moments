import prisma from "~/lib/db";

export default defineEventHandler(async () => {
    let data = await prisma.systemConfig.findFirst({
        where: {
            key: "metingApi",
        },
    });
    if(!data || !data.value || data.value === ''){
        data = {
            key: "metingApi",
            value: 'https://meting-dd.2333332.xyz/'
        }
    }
    return {
        success: true,data
    };
});