<template>
  <HeaderImg />
  <div class="p-2 sm:p-4 flex justify-center min-h-[500px w-full]">
    <div class="p-8 rounded shadow-md max-w-sm w-full">

      <div class="mb-4">
        <Label for="username" class="block text-gray-700 mb-2">用户名/邮箱</Label>
        <div class="flex flex-row gap-2">
          <Input v-model="state.email" autocomplete="off" type="text" id="username" />
          <Button id="sendMail" type="button">发送验证码</Button>
        </div>
      </div>
      <div class="flex flex-row gap-2 justify-end">
        <Button variant="ghost" @click="navigateTo('/login')" type="button">前往登陆</Button>
        <Button variant="ghost" @click="navigateTo('/register')" type="button">前往登陆</Button>
        <Button variant="ghost" @click="navigateTo('/')" type="button">返回首页</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {toast} from "vue-sonner";


const state = reactive({
  username: '',
  email: '',
  password: '',
  emailVerificationCode: ''
})


onMounted(() => {

  // document.getElementById('vcode').hidden = true
  const sendMail = async () => {
    // 按钮禁用
    document.getElementById('sendMail').disabled = true
    toast.promise(
        $fetch('/api/user/sendMail', {
          method: 'POST',
          body: JSON.stringify({
            email: state.email,
            action: 'resetPassword'
          })
        }), {
          loading: '发送中...',
          success: (data) => {
            document.getElementById('sendMail').disabled = false;
            if (data.success) {
              return '发送成功，如果您的登陆名/邮箱存在于我们的数据库中，我们将发送一封邮件到您的邮箱，请注意查收';
            } else {
              return '发送失败: ' + data.message;
            }
          },
          error: (error) => `发送失败: ${error.message || '未知错误'}`, // 显示具体的错误信息
        }
    );
  }

  document.getElementById('sendMail').addEventListener('click', sendMail)
})

</script>

<style scoped></style>