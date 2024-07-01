<template>
  <HeaderImg />
  <div class="p-2 sm:p-4 flex justify-center min-h-[500px w-full]">
    <div class="p-8 rounded shadow-md max-w-sm w-full">
      <div class="mb-6">
        <Label for="password" class="block text-gray-700 mb-2">密码</Label>
        <Input v-model="state.password" autocomplete="off" type="password" id="password" />
      </div>
      <div class="flex flex-row gap-2">
        <Button @click="forget" type="button">提交</Button>
        <Button variant="ghost" @click="navigateTo('/')" type="button">返回首页</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {toast} from "vue-sonner";

const route = useRoute()

const state = reactive({
  user: route.params.id,
  password: '',
  emailVerificationCode: ''
})


onMounted(() => {
  // 获取url参数v http://localhost:3000/user/recovery/1?v=eEfht7
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('v')){
    state.emailVerificationCode = urlParams.get('v')
  } else {
    navigateTo('/')
  }
})


const forget = async () => {

  toast.promise(
      $fetch('/api/user/forget', {
        method: 'POST',
        body: JSON.stringify(state)
      }), {
        loading: '检查中...',
        success: (data) => {
          if (data.success) {
            setTimeout(() => {
              navigateTo('/login')
            }, 2000)
            return '更新密码成功，即将前往登陆页面';

          } else {
            return '更新密码失败: ' + data.message;
          }
        },
        error: (error) => `任务失败: ${error.message || '未知错误'}`,
      }
  );
}
</script>

<style scoped></style>