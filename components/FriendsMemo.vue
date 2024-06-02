<template>

  <div class="memo flex flex-row gap-2 sm:gap-4 text-sm border-x-0 pt-2 p-2 sm:p-4" :class="{'bg-slate-100 dark:bg-neutral-900':props.memo.pinned && props.memo.userId == 1}">
    <img :src="props.memo.user.avatarUrl" class="avatar w-9 h-9 rounded" @click="gotouser" />
    <div class="flex flex-col gap-.5 flex-1">
      <div class="flex flex-row justify-between items-center">
        <div class="username text-[#576b95] cursor-default mb-1 dark:text-white" @click="gotouser">{{ props.memo.user.nickname }}</div>
        <Pin :size=14 v-if="props.memo.pinned && props.memo.userId == 1" />
      </div>
      <div class="memo-content text-sm friend-md words-container" ref="el" v-html="replaceNewLinesExceptInCodeBlocks(props.memo.content)"> </div>
      <div class="text-[#576b95] cursor-pointer" v-if="hh > 96 && !showAll" @click="showMore">全文</div>
      <div class="text-[#576b95] cursor-pointer " v-if="showAll" @click="showLess">收起</div>
      <div class="flex flex-row gap-2 my-2 bg-[#f7f7f7] dark:bg-[#212121] items-center p-2 border rounded"
        v-if="props.memo.externalFavicon && props.memo.externalTitle">
        <img class="w-8 h-8" :src="props.memo.externalFavicon" alt="">
        <a :href="props.memo.externalUrl" target="_blank" class="text-[#576b95]">{{ props.memo.externalTitle }}</a>
      </div>

      <div v-if="imgs.length">
        <FancyBox
            :key="fancyBoxKey"
            class="grid my-1 gap-0.5"
            :style="gridStyle"
            ref="myFancyBox"
            :options="{ Carousel: { infinite: false } }"
        >
          <img
              loading="lazy"
              :class="imgs.length === 1 ? 'cursor-pointer rounded full-cover-image-single' : ' rounded cursor-grab full-cover-image-mult'"
              v-lazy="getImgUrl(img)"
              v-for="(img, index) in imgs" :key="index"
          />
        </FancyBox>
      </div>
      <div class="text-[#57BE6B] font-medium dark:text-white text-xs mt-3 select-none" v-if="memo.userId === userId">
        {{(props.memo.atpeople?('提到了'+atpeoplenickname):'')}}
      </div>
      <div class="text-[#57BE6B] font-medium dark:text-white text-xs mt-3 select-none" v-if="memo.userId !== userId">
        {{(props.memo.atpeople?(props.memo.atpeople?.split(',').indexOf(''+userId)===-1?'':'提到了我'):'')}}
      </div>
      <div class="text-[#576b95] font-medium dark:text-white text-xs mt-1 mb-1 select-none">{{props.memo.location?.split(/\s+/g).join(' · ')}}</div>
      <div class="toolbar relative flex flex-row justify-between select-none my-1">
        <div class="flex-1 text-gray text-xs text-[#9DA4B0] ">{{
          dayjs(props.memo.createdAt).locale('zh-cn').fromNow().replaceAll(/\s+/g,
            '') }}</div>
        <div @click="showToolbar = !showToolbar"
          class="toolbar-icon mb-2 px-2 py-1 bg-[#f7f7f7] dark:bg-slate-700 hover:bg-[#dedede] cursor-pointer rounded flex items-center justify-center">
          <img src="~/assets/img/dian.svg" class="w-3 h-3" />
        </div>
        <div class="text-xs absolute top-[-8px] right-[30px] bg-[#4c4c4c] rounded text-white p-2" v-if="showToolbar"
          ref="toolbarRef">
          <div class="flex flex-row gap-4">
            <div class="flex flex-row gap-2 cursor-pointer items-center" v-if="token && userId === props.memo.userId"
              @click="pinned(); showToolbar = false">
              <Pin :size=14 />
              <div>{{ (props.memo.pinned ? '取消' :'') + '置顶'}}</div>
            </div>
            <div class="flex flex-row gap-2 cursor-pointer items-center" v-if="token && userId === props.memo.userId" @click="editMemo">
              <FilePenLine :size=14 />
              <div>编辑</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div class="flex flex-row gap-2 cursor-pointer items-center" v-if="token && userId === props.memo.userId">
                  <Trash2 :size=14 />
                  <div>删除</div>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定删除吗?</AlertDialogTitle>
                  <AlertDialogDescription>
                    无法恢复,你确定删除吗?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction @click="removeMemo">确定</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div class="flex flex-row gap-2 cursor-pointer items-center" @click="like">
              <Heart :size=14 v-if="likeList.findIndex((id) => id === props.memo.id) < 0" />
              <HeartCrack :size=14 v-else />
              <div>{{ likeList.findIndex((id) => id === props.memo.id) >= 0 ? '取消' : '赞' }}</div>
            </div>

            <div class="flex flex-row gap-2 cursor-pointer items-center"
              @click="showCommentInput = !showCommentInput; showUserCommentArray = []; showToolbar = false">
              <MessageSquareMore :size=14 />
              <div>评论</div>
            </div>
          </div>
        </div>
      </div>
      <div class="rounded bottom-shadow bg-[#f7f7f7] dark:bg-[#202020] flex flex-col gap-1  ">
        <div class="flex flex-row py-2 px-4 gap-2 items-center text-sm" v-if="props.memo.favCount > 0">
          <Heart :size=14 color="#C64A4A" />
          <div class="text-[#576b95]"><span class="mx-1">{{ props.memo.favCount }}</span>位访客赞过</div>
        </div>
        <FriendsCommentInput :memoId="props.memo.id" @commentAdded="refreshComment" v-if="showCommentInput" />
        <template v-if="props.memo.comments.length > 0">
          <div class="px-4 py-2 flex flex-col gap-1">
            <div class="relative flex flex-col gap-2 text-sm" v-for="(comment, index) in props.memo.comments" :key="index">
              <Comment :comment="comment" :belongToMe="userId === props.memo.userId" @memo-update="refreshComment" />
            </div>
            <div v-if="props.memo.hasMoreComments" class="text-[#576b95] cursor-pointer"
              @click="navigateTo(`/detail/${props.memo.id}`)">查看更多...</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Memo } from '@/lib/types';
import { useElementSize, onClickOutside, watchOnce, useStorage } from '@vueuse/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { Heart, HeartCrack, MessageSquareMore, Trash2, FilePenLine, Pin } from 'lucide-vue-next'
import { memoUpdateEvent, memoAddEvent, headigUpdateEvent, memoDeleteEvent} from '@/lib/event'
import { getImgUrl } from '~/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {toast} from "vue-sonner";
import DOMPurify from 'dompurify';

const token = useCookie('token')
let fancyBoxKey = ref(0);

let imgs = computed(() => props.memo.imgs ? props.memo.imgs.split(',') : []);

const myFancyBox = ref()

const atpeoplenickname = ref('')

let userId = ref(0)

const gridStyle = computed(() => {
  let style = 'align-items: start;'; // 确保内容顶部对齐
  switch (imgs.value.length) {
    case 1:
      style += 'grid-template-columns: 1fr;';
      break;
    case 2:
      style += 'grid-template-columns: 1fr 1fr; aspect-ratio: 2 / 1;';
      break;
    case 3:
      style += 'grid-template-columns: 1fr 1fr 1fr; aspect-ratio: 3 / 1;';
      break;
    case 4:
      style += 'grid-template-columns: 1fr 1fr; aspect-ratio: 1;';
      break;
    default:
      style += 'grid-template-columns: 1fr 1fr 1fr; aspect-ratio: 3 / 1;';
  }
  return style;
});

dayjs.extend(relativeTime)

const props = withDefaults(
  defineProps<{
    memo: Memo,
    showMore: boolean,
  }>(), {}
)

const refreshAtpeople = async ()=>{
  if(props.memo.atpeople?.split(',')){
    atpeoplenickname.value = ''
    for(let i=0;i<props.memo.atpeople?.split(',').length;i++){
      $fetch('/api/user/settings/get?user='+props.memo.atpeople?.split(',')[i]).then(res => {
        if (res.success) {
          atpeoplenickname.value += ' ' + res.data.nickname
        }
      })
    }
  }
}

refreshAtpeople()

const emit = defineEmits(['memo-update'])

const showAll = ref(false)
const showToolbar = ref(false)
const showCommentInput = ref(false)
const toolbarRef = ref(null)
const showUserCommentArray = ref<Array<boolean>>([])
const el = ref<any>(null)
let hh = ref(0)
const { height } = useElementSize(el)
const likeList = useStorage<Array<number>>('likeList', [])

onClickOutside(toolbarRef, () => {
  showToolbar.value = false
})

onMounted(async () => {
  if (token) {
    userId = useCookie('userId')
  }
  el.value.addEventListener('click', (e: any) => {
    if (e.target.tagName === 'CODE') {
      navigator.clipboard.writeText(e.target.innerText).then(() => {
        toast.success('已复制到剪贴板')
      })
    }
  })
})

const gridCols = computed(() => {
  const imgLen = (props.memo.imgs || '').split(',').length;
  return imgLen >= 3 ? 3 : imgLen
})

const like = async () => {
  showToolbar.value = false
  const contain = likeList.value.find((id) => id === props.memo.id)
  const res = await $fetch('/api/memo/like', {
    method: 'POST',
    body: JSON.stringify({
      memoId: props.memo.id,
      like: !contain
    })
  })
  if (res.success) {
    if (contain) {
      likeList.value = likeList.value.filter((id) => id !== props.memo.id)
    } else {
      likeList.value.push(props.memo.id)
    }
    emit('memo-update')
  }
}

const pinned = async ()=>{
  showToolbar.value = false
  const res = await $fetch('/api/memo/pinned', {
    method: 'POST',
    body: JSON.stringify({
      memoId: props.memo.id,
      pinned:!(props.memo.pinned)
    })
  })
  if (res.success) {
    toast.success('操作成功')
    emit('memo-update')
  }
}

const removeMemo = async () => {
  showToolbar.value = false
  const res = await $fetch('/api/memo/remove', {
    method: 'POST',
    body: JSON.stringify({
      memoId: props.memo.id
    })
  })
  if (res.success) {
    toast.success('删除成功')
    emit('memo-update')
    memoDeleteEvent.emit()
    location.reload()
  }
}

const editMemo = async () => {
  showToolbar.value = false
  memoUpdateEvent.emit(props.memo)
}

memoAddEvent.on((id: any, body: any) => {
  if (id == props.memo.id) {
    emit('memo-update')
    atpeoplenickname.value = ''
    props.memo.atpeople = body.data.atpeople
    for (let i = 0; i < body.atpeopleNickname.length; i++) {
      atpeoplenickname.value += ' ' + body.atpeopleNickname[i]
    }
    if(body.data.imgUrls.join(',') !== imgs.value.join(',')){
      props.memo.imgs = body.data.imgUrls.join(',')
      fancyBoxKey.value++;
    }
  }
  if(body.data.id <= 0){
    emit('memo-update')
    fancyBoxKey.value++;
  }
})

memoDeleteEvent.on(() => {
  emit('memo-update')
  fancyBoxKey.value++;
})

const refreshComment = async () => {
  emit('memo-update', props.memo)
  showUserCommentArray.value = []
  showCommentInput.value = false
}


const showMore = () => {
  showAll.value = true
  el.value.classList.remove('line-clamp-4')
}
const showLess = () => {
  showAll.value = false
  el.value.classList.add('line-clamp-4')
}

const colorMode = useColorMode()

const replaceNewLinesExceptInCodeBlocks = (text: any) => {
  text = text.replaceAll(/#(\S+)/g, '[#$1](/tags/$1)');

  // 将链接转换为a标签
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 处理粗体、斜体、删除线、单词块
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // 粗体
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>'); // 斜体
  text = text.replace(/~~(.*?)~~/g, '<del>$1</del>'); // 删除线
  text = text.replace(/`(.*?)`/g, '<code>$1</code>'); // 单词块

  // 处理待办事项框
  text = text.replace(/^\[ \] (.*?)(?=\n|$)/gmi, '<input type="checkbox" disabled> $1'); // 未完成
  text = text.replace(/^\[[xX]\] (.*?)(?=\n|$)/gmi, '<input type="checkbox" checked disabled> $1'); // 完成

  // 将text根据换行符分割成数组
  const spices = text.split('\n');
  for (let j = 0; j < spices.length; j++) {
    if (spices[j].startsWith('![')) {
      const img = spices[j].match(/!\[(.*?)\]\((.*?)\)/);
      if (img) {
        spices[j] = `<img src="${img[2]}" alt="${img[1]}" class="cursor-pointer" @click="navigateTo('${img[2]}')"/>`;
      }
    } else if (/^\d+\./.test(spices[j])) {
      spices[j] = '<p>' + spices[j] + '</p>';
    } else if (/^-/.test(spices[j])) {
      spices[j] = '<li>' + spices[j].replace(/^-/, '') + '</li>';
    } else {
      spices[j] = '<span>' + spices[j] + '</span><br />';
    }
  }
  text = spices.join('');
  if (text.endsWith('<br />')) {
    text = text.substring(0, text.length - 6);
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: ['a', 'p', 'span', 'ul', 'ol', 'li', 'img', 'strong', 'em', 'del', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'iframe', 'input'] });
};


watchOnce(height, () => {
  hh.value = height.value
  if (height.value > 96) {
    el.value.classList.add('line-clamp-4')
  }
})

const gotouser = () => {
  navigateTo(`/user/${props.memo.userId}`)
  let event = new CustomEvent('headimgrefresh', { detail: { userId: props.memo.userId } });
  // window.dispatchEvent(event);
  headigUpdateEvent.emit(event)
}

</script>

<style>
.full-cover-image-mult {
  object-fit: cover;
  object-position: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: transparent 1px solid;
}

.full-cover-image-single {
  object-fit: cover;
  object-position: center;
  max-height: 200px;
  height: auto;
  width: auto;
  border: transparent 1px solid;
}

.words-container{
  word-break: break-all;
  white-space: pre-wrap;
}

.words-container a{
  color: #3C4F7E;
  text-decoration: none;
}

.words-container ul {
  list-style-type: circle;
  padding-left: 20px;
  margin-left: 0;
}
.words-container ol {
  list-style-type: roman;
  padding-left: 20px;
  margin-left: 0;
}

/* 样式定义 */
.words-container code {
  background-color: #f0f0f0; /* 浅灰色背景 */
  color: #00a7a7; /* 蓝绿色字体颜色 */
  padding: 2px 4px;
  border-radius: 4px; /* 圆润边角 */
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.875rem; /* 调整字体大小 */
  line-height: 1.25rem; /* 调整行高 */
}

.words-container input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 16px; /* 调整复选框宽度 */
  height: 16px; /* 调整复选框高度 */
  border: 2px solid #00a7a7; /* 蓝绿色边框 */
  border-radius: 3px;
  background-color: #fff; /* 白色背景 */
  transform: translate(0, 20%); /* 使对勾符号居中 */
  cursor: pointer;
  position: relative;
  margin-right: 8px;
}

.words-container input[type="checkbox"]:checked {
  background-color: #00a7a7; /* 选中时蓝绿色背景 */
  border: 2px solid #00a7a7; /* 选中时蓝绿色边框 */

}

.words-container input[type="checkbox"]:checked::after {
  content: '✔';
  color: #fff;
  position: absolute;
  top: 50%; /* 调整对勾符号的位置 */
  left: 50%; /* 调整对勾符号的位置 */
  transform: translate(-50%, -50%); /* 使对勾符号居中 */
  font-size: 14px; /* 调整对勾符号的字体大小 */
  line-height: 1.25;
}

.dark .words-container code {
  background-color: #2d2d2d; /* 深灰色背景 */
  color: #66d9ef; /* 浅蓝绿色字体颜色 */
}

.dark .words-container input[type="checkbox"] {
  border: 2px solid #66d9ef; /* 浅蓝绿色边框 */
  background-color: #2d2d2d; /* 深灰色背景 */
}

.dark .words-container input[type="checkbox"]:checked {
  background-color: #66d9ef; /* 选中时浅蓝绿色背景 */
  border: 2px solid #66d9ef; /* 选中时浅蓝绿色边框 */
}


</style>