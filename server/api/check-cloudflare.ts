import { defineEventHandler } from 'h3';
import axios from 'axios';

export default defineEventHandler(async (event) => {
    // 获取访问的站点 URL，不需要参数
    const siteUrl = new URL(event.req.url, `http://${event.req.headers.host}`).origin;

    try {
        const response = await axios.head(siteUrl);
        const isCloudflare = response.headers['cf-ray'] || response.headers['cf-visitor'];
        return { isCloudflare: !!isCloudflare };
    } catch (error) {
        return { isCloudflare: false };
    }
});