import prisma from "~/lib/db";

export default defineEventHandler(async (event) => {
    const about = await prisma.systemConfig.findFirst({
        where: {
            key: 'aboutHtml',
        },
    });
    if(!about || !about.value || about.value === ''){
        return {
            success: false,
        };
    }else{
        return {
            success: true,
            data: about.value,
        };
    }
});
