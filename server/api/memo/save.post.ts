import prisma from "~/lib/db";
import { aliTextJudge } from '~/utils/aliTextJudge';
import {sendEmail} from "~/utils/sendEmail";

type SaveMemoReq = {
  id?: number;
  content: string;
  imgUrls?: string[];
  atpeople?: number[];
  avpeople?: number[];
  location?: string;
  externalUrl?: string;
  externalTitle?: string;
  externalFavicon?: string;
  music163Url?: string;
};

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

const siteConfig = await prisma.config.findUnique({
  where: {
    id: 1,
  },
});

let siteUrl = siteConfig?.siteUrl;

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as SaveMemoReq;

    if (!body.content) {
        return {
        success: false,
        message: "内容不能为空",
        };
    }
    // if(body.content.length > 600){
    //     return {
    //     success: false,
    //     message: "内容长度不能超过600个字符",
    //     };
    // }

  const memo = await prisma.memo.findUnique({
    where: {
      id: body.id ?? -1,
    },
  });

  if(memo && (memo?.userId !== event.context.userId)){
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if(siteConfig?.enableAliyunDective && siteConfig?.aliyunAccessKeyId !== '' && siteConfig?.aliyunAccessKeySecret !== '' && event.context.userId !== 1){
    // 将 body.content 按照每600个字符分割成数组
    let contentArray = body.content.match(/[\s\S]{1,600}/g);
    // 遍历数组，对每个数组元素进行文本审核
    for(let i = 0; i < contentArray.length; i++) {
      const aliJudgeResponse1 = await aliTextJudge(contentArray[i], 'comment_detection', siteConfig?.aliyunAccessKeyId, siteConfig?.aliyunAccessKeySecret);
      if (aliJudgeResponse1.Data && aliJudgeResponse1.Data.labels && aliJudgeResponse1.Data.labels !== '') {
        let labelsList = aliJudgeResponse1.Data.labels.split(',');
        return {
          success: false,
          message: "内容不符合规范：" + labelsList.map((label: string) => staticWord[label]).join(', '),
        };
      }
    }
  }

  let atpeople = body.atpeople;
    if (atpeople) {
        atpeople = atpeople.filter((item) => item !== event.context.userId);
    }
    let avpeople = body.avpeople;
  let avpeopleString :any = [];
  if (avpeople && avpeople.length > 0) {
    if (!avpeople.includes(event.context.userId)) {
      avpeople.push(event.context.userId);
    }
    if (atpeople) {
        atpeople.forEach((item) => {
            if (!avpeople.includes(item)) {
            avpeople.push(item);
            }
        });
    }
    avpeopleString = avpeople.map((item) => "#" + item + "$");
  }

  const updated = {
    imgs: body.imgUrls?.join(","),
    atpeople: atpeople?.join(","),
    availableForProple: avpeopleString?.join(","),
    location: body.location,
    externalUrl: body.externalUrl,
    externalTitle: body.externalTitle,
    externalFavicon: body.externalFavicon,
    content: body.content,
    music163Url: body.music163Url,
  };
  const result = await prisma.memo.upsert({
    where: {
      id: body.id ?? -1,
    },
    create: {
      userId: event.context.userId,
      ...updated,
    },
    update: {
      ...updated,
    },
  });

    if (atpeople && atpeople.length > 0) {
        const user = await prisma.user.findUnique({
        where: {
            id: event.context.userId,
        },
        });
        for (const item of atpeople) {
          const userat = await prisma.user.findUnique({
            where: {
              id: item,
            },
          });
          if(userat && userat.eMail && userat.eMail !== '' && userat.eMail !== user?.eMail){
            let tmpmsg = `有一条新提及您的动态！
                用户名为:  ${user?.nickname} 的用户在动态中提及了您，点击查看: ${siteUrl}/detail/${result.id}`;
            const emailNewMentionCommentNotification = await prisma.systemConfig.findFirst({
                where: {
                    key: 'emailNewMentionCommentNotification',
                },
            });
            if(emailNewMentionCommentNotification && emailNewMentionCommentNotification.value && emailNewMentionCommentNotification.value !== ''){
              tmpmsg = emailNewMentionCommentNotification.value;
            }
            tmpmsg = tmpmsg.replaceAll('{Sitename}', siteConfig?.title);
            tmpmsg = tmpmsg.replaceAll('{SiteUrl}', siteUrl);
            tmpmsg = tmpmsg.replaceAll('{MemoUrl}', `${siteUrl}/detail/${result.id}`);
            tmpmsg = tmpmsg.replaceAll('{Nickname}', user?.nickname);
            tmpmsg = tmpmsg.replaceAll('{Content}', result.content);
            sendEmail({
              email: userat.eMail,
              subject: '新提及',
              message: tmpmsg,
            });
          }
        }
    }

  return {
    success: true,
    id: result.id,
  };
});
