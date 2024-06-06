<template>
  <div class="header relative mb-12">
    <img
        :key="user.headImgKey"
        class="header-img w-full max-h-[300px]"
        :src="getImgUrl(user.coverUrl)"
        alt=""
    />
    <div class="absolute right-2 left-2 bottom-[-40px]" style="width: calc(100% - 16px)">
      <div class="userinfo flex flex-col">
        <div class="flex flex-row items-center gap-4 justify-end">
          <div
              :key="user.headImgKey"
              class="username text-lg font-bold text-white"
          >{{ user.nickname }}</div>
          <img
              :key="user.headImgKey"
              :src="getImgUrl(user.avatarUrl)"
              class="avatar w-[70px] h-[70px] rounded-xl"
          />
        </div>
        <div class="flex flex-row items-center gap-4 justify-end">
          <div v-if="shwoWeather">
            <iframe
                scrolling="no"
                src="https://widget.tianqiapi.com/?style=tz&skin=pitaya&color=000"
                frameborder="0"
                width="200"
                height="20"
                allowtransparency="true"
                v-if="colorMode.value === 'light'"
            ></iframe>
            <iframe
                scrolling="no"
                src="https://widget.tianqiapi.com/?style=tz&skin=pitaya&color=fff"
                frameborder="0"
                width="200"
                height="20"
                allowtransparency="true"
                v-if="colorMode.value === 'dark'"
            ></iframe>
          </div>
          <div
              :key="user.headImgKey"
              class="slogon text-gray truncate w-full text-end text-xs mt-2"
          >{{ user.slogan }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { headigUpdateEvent, settingsUpdateEvent } from '~/lib/event';
import { getImgUrl } from '~/lib/utils';
import { reactive, onMounted, ref } from 'vue';
const colorMode = useColorMode();
const token = useCookie('token');
const route = useRoute();

const userId = useCookie('userId');
let findId = userId.value;

const user = reactive({
  headImgKey: 0,
  coverUrl: '',
  nickname: '',
  avatarUrl: '',
  slogan: ''
});

async function fetchUserData(id: any) {
  const response = await $fetch('/api/user/settings/get?user=' + (id == 'undefined' ? '0' : id));
  if (response && response.success) {
    user.coverUrl = response.data.coverUrl;
    user.nickname = response.data.nickname;
    user.avatarUrl = response.data.avatarUrl;
    user.slogan = response.data.slogan;
    user.headImgKey++; // Force re-render by changing key
  }
}
const shwoWeather = ref(false)
onMounted(async () => {
  const url = window.location.pathname;
  if (url.startsWith('/user/')) {
    findId = url.split('/user/')[1];
  }
  await fetchUserData(findId);
  await $fetch('/api/user/settings/get').then((res) => {
    if (res.success) {
      shwoWeather.value = (res.data.customWeather == "1")
    }
  })

});

settingsUpdateEvent.on(async () => {
  await fetchUserData(findId);
});

headigUpdateEvent.on(async (event) => {
  const userId = event.detail.userId + '';
  await fetchUserData(userId);
});
</script>

<style scoped></style>
