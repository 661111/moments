import prisma from "~/lib/db";
import { randomBytes } from 'crypto';

const getJwtKey = async () => {
    const key = await prisma.systemConfig.findFirst({
        where: {
            key: "jwtKey",
        },
    });
    if (!key) {
        const jwtKey = randomBytes(32).toString('hex');
        await prisma.systemConfig.create({
            data: {
                key: "jwtKey",
                value: jwtKey,
                type: 0,
            },
        });
        return jwtKey;
    } else {
        return key.value;
    }
}

export const jwtKey = await getJwtKey();