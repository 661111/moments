# 极简朋友圈

- 支持匿名评论/点赞
- 支持引入网易云音乐,b站视频,插入链接等
- 支持自定义头图,个人头像,网站标题等
- 支持上传图片到S3兼容的云存储,支持本地存储
- 适配手机
- 支持暗黑模式
- 数据库采用sqlite,可随时备份

默认用户名密码:`admin/a123456`

## 源码编译启动

首先设置环境变量:

```
# 设置 sqlite 数据库位置
export DATABASE_URL="file:/root/moments/data/db.sqlite" 
# 设置本地上传的文件目录
export UPLOAD_DIR="/root/moments/data/upload"
```
> 或者写进环境变量中

执行命令

```
# 安装依赖
npm install
# 脚本迁移
npx prisma migrate dev
# 执行构建
npm run build
# 预览
npm run preview
```

## 编辑SQLITE数据库

```
# 容器内部执行
npx prisma studio
```

执行上面的命令会在容器内部暴露一个5555端口,暴露到主机后可以通过 `http://容器IP:5555` 访问数据库,直接修改/删除/新增数据.


## 配置S3

由于使用了[使用预签名 URL 上传对象](https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)方案来上传图片到S3,简单来说就是前端直接上传文件到S3,不经过服务端.

不支持这个预签名技术的S3无法上传,据我所知,号称兼容S3的云存储大部分都支持这个特性.比如腾讯云,七牛云,阿里云等.

另外,要求在S3上配置跨域,配置你当前的域名能够访问S3的资源,不配置的话,是无法使用的.

## 重置密码

目前没有别的办法重置密码,只有修改数据库.见[编辑SQLITE数据库](https://github.com/kingwrcy/moments?tab=readme-ov-file#%E7%BC%96%E8%BE%91sqlite%E6%95%B0%E6%8D%AE%E5%BA%93).

或者任何能正常打开SQLITE数据库的工具都行,数据库见前面的环境变量部分.

打开[bcrypt-generator](https://bcrypt-generator.com/)或者其他类似的bcrypt在线加密的网站,加密你的密码.

复制加密后的密码,编辑数据库,更新User表pwd字段,更新完后记得关掉5555端口的映射,执行`npx prisma studio`命令停止5555端口.
