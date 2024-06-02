<template>
  <div>
    <div class="p-2 sm:p-4">
      <FriendsMemo :memo="data as any as Memo" v-if="success" :show-more="true" @memo-update="refresh" />
      <span v-if="success==false">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Memo } from '~/lib/types';

const route = useRoute()
const id = route.params.id

const success = ref(false)
const message = ref('')
const data = ref({} as Memo)

onMounted(() => {
  const res =  $fetch('/api/memo/detail', {
    method: 'POST',
    body: JSON.stringify({ id: id})
  }).then(res => {
    success.value = res.success
    if (res.success) {
      data.value = res.data
    } else {
      message.value = res.message
    }
  })
})

const refresh = () => {
  const res =  $fetch('/api/memo/detail', {
    method: 'POST',
    body: JSON.stringify({ id: id})
  }).then(res => {
    success.value = res.success
    if (res.success) {
      data.value = res.data
    } else {
      message.value = res.message
    }
  })
}

</script>

<style scoped></style>