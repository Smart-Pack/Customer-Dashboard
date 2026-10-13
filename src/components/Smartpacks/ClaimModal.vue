<template>
  <section class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <form
      @submit.prevent="claimSmartPack"
      class="main-card flex w-[90vw] max-w-lg flex-col gap-4 p-4"
    >
      <!-- Title -->
      <h2 class="main-heading text-center text-lg">Claim SmartPack</h2>

      <!-- Body -->
      <div v-if="!scanMode" class="card-base space-y-6 px-6 py-4 text-sm secondary-text">
        <!-- QR Code -->
        <div class="space-y-2">
          <p id="smartpack-qr-label" class="ml-2 block font-semibold">
            Scan or Upload SmartPack QR Code
          </p>

          <div class="flex flex-col items-start gap-4">
            <QrcodeCapture
              class="w-56 form-submit-secondary p-2 text-sm"
              aria-labelledby="smartpack-qr-label"
              :capture="selectedCapture"
              @detect="onQrDetect"
            />

            <button
              type="button"
              class="w-56 form-submit-secondary px-4 py-2 text-sm"
              :disabled="submitting"
              @click="startScan"
            >
              Scan QR Code
            </button>
          </div>

          <p v-if="qrError" class="text-sm text-red-500">
            {{ qrError }}
          </p>

          <div v-if="hasDetectedCode" class="space-y-1 text-sm">
            <p class="font-semibold">QR Code Detected</p>
            <p class="break-all"><span class="font-medium">Device UID:</span> {{ deviceUid }}</p>
            <p class="break-all"><span class="font-medium">IMEI:</span> {{ imei }}</p>
          </div>
        </div>
      </div>

      <!-- QR Scanner -->
      <div
        v-else
        ref="scannerWrapper"
        :class="{ fullscreen: fullscreen }"
        class="relative h-80 overflow-hidden"
        @fullscreenchange="onFullscreenChange"
      >
        <QrcodeStream
          :constraints="selectedConstraints"
          :formats="['qr_code']"
          @detect="onScanDetect"
          @error="onScanError"
          @camera-on="onCameraOn"
        >
          <!-- Camera loading -->
          <div v-if="scannerLoading" class="absolute inset-0 flex items-center justify-center">
            <div class="submit-spinner"></div>
          </div>

          <!-- Scanner controls -->
          <div
            class="card-base absolute bottom-4 right-4 z-20 flex items-center gap-2 p-2 primary-text"
          >
            <!-- Fullscreen -->
            <button
              type="button"
              class="form-submit-secondary p-2 text-sm"
              @click="toggleFullscreen"
            >
              {{ fullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
            </button>

            <!-- Close scanner -->
            <button
              type="button"
              class="form-submit-secondary p-2"
              aria-label="Close QR scanner"
              @click="stopScan"
            >
              <CloseIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Scanner error -->
          <p
            v-if="qrError"
            class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-red-500"
          >
            {{ qrError }}
          </p>
        </QrcodeStream>
      </div>

      <!-- Buttons -->
      <div class="grid grid-cols-2 items-center gap-4 secondary-text">
        <button
          type="button"
          class="form-submit-secondary p-2 text-sm lg:!max-w-28"
          :disabled="submitting"
          @click="close"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="form-submit overflow-x-hidden px-6 py-2 text-sm lg:!max-w-52 lg:justify-self-end"
          :disabled="submitting || scanMode || !hasDetectedCode"
        >
          <span>{{ submitButtonText }}</span>
          <div v-if="submitting" class="ml-2 submit-spinner"></div>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
/**
 * @module components/Smartpacks/ClaimModal
 * @description Modal for claiming an unassigned SmartPack using its
 * QR code containing the device UID and IMEI.
 */

import { computed, onBeforeUnmount, ref } from 'vue'
import { QrcodeCapture, QrcodeStream } from 'vue-qrcode-reader'

import CloseIcon from '@/components/Icons/CloseIcon.vue'
import { claim } from '@/api/modules/smartpacks'
import { useGlobals } from '@/composables/useGlobals'

const { $notifySuccess, $notifyError } = useGlobals()

const emit = defineEmits<{
  close: []
  claimed: []
}>()

/** Shape of the JSON payload encoded in a SmartPack QR code. */
interface SmartPackQrPayload {
  device_uid?: string
  imei?: string
  type?: string
}

const SMARTPACK_QR_TYPE = 'smartpack'
const INVALID_QR_MESSAGE = 'Invalid SmartPack QR code.'
const FULLSCREEN_UNSUPPORTED_MESSAGE = 'Fullscreen is not supported on this device.'

/** User-friendly messages for the errors vue-qrcode-reader can report. */
const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: 'Camera access was denied. Allow camera access in your browser settings.',
  NotFoundError: 'No camera was found on this device.',
  NotSupportedError: 'Camera access requires a secure (HTTPS) connection.',
  NotReadableError: 'The camera is already in use by another application.',
  OverconstrainedError: 'No suitable camera was found on this device.',
  StreamApiNotSupportedError: 'Camera scanning is not supported in this browser.',
  InsecureContextError: 'Camera access is only allowed on secure (HTTPS) connections.',
}

const submitting = ref(false)
const scannerLoading = ref(true)
const scanMode = ref(false)
const fullscreen = ref(false)

const qrError = ref('')

const deviceUid = ref('')
const imei = ref('')

const scannerWrapper = ref<HTMLElement | null>(null)

const selectedCapture = 'environment'

const selectedConstraints = {
  facingMode: 'environment',
}

const hasDetectedCode = computed(() => Boolean(deviceUid.value && imei.value))

const submitButtonText = computed(() => (submitting.value ? 'Claiming...' : 'Claim SmartPack'))

/**
 * Clears any previously detected SmartPack values.
 */
const resetDetectedCode = () => {
  deviceUid.value = ''
  imei.value = ''
}

/**
 * Parses and validates a raw QR value, storing the SmartPack details when valid.
 *
 * Previously detected values are always cleared first so a failed scan can never
 * leave stale data behind.
 *
 * @param rawValue - Raw string decoded from the QR code.
 * @returns Whether the QR code was a valid SmartPack QR code.
 */
const applyQrCode = (rawValue: string): boolean => {
  resetDetectedCode()

  try {
    const data = JSON.parse(rawValue) as SmartPackQrPayload

    if (data.type !== SMARTPACK_QR_TYPE || !data.device_uid || !data.imei) {
      qrError.value = INVALID_QR_MESSAGE
      return false
    }

    deviceUid.value = data.device_uid
    imei.value = data.imei
    qrError.value = ''

    return true
  } catch {
    qrError.value = INVALID_QR_MESSAGE
    return false
  }
}

/**
 * Handles QR codes detected from an uploaded image.
 *
 * @param detectedCodes - QR codes detected by the QR reader.
 */
const onQrDetect = (detectedCodes: Array<{ rawValue: string }>) => {
  const detectedCode = detectedCodes[0]

  if (!detectedCode) {
    resetDetectedCode()
    qrError.value = 'No QR code was detected.'
    return
  }

  applyQrCode(detectedCode.rawValue)
}

/**
 * Starts QR camera scanning.
 */
const startScan = () => {
  qrError.value = ''
  scannerLoading.value = true
  scanMode.value = true
}

/**
 * Handles the camera becoming ready.
 */
const onCameraOn = () => {
  scannerLoading.value = false
}

/**
 * Handles QR codes detected by the camera.
 *
 * A valid SmartPack QR code automatically exits scan mode.
 *
 * @param detectedCodes - QR codes detected by the camera.
 */
const onScanDetect = (detectedCodes: Array<{ rawValue: string }>) => {
  const detectedCode = detectedCodes[0]

  if (!detectedCode) {
    return
  }

  if (applyQrCode(detectedCode.rawValue)) {
    stopScan()
  }
}

/**
 * Handles camera errors.
 *
 * @param error - Camera error returned by QrcodeStream.
 */
const onScanError = (error: Error) => {
  scannerLoading.value = false
  qrError.value =
    CAMERA_ERROR_MESSAGES[error.name] ?? `Unable to start the camera: ${error.message}`
}

/**
 * Exits browser fullscreen when it is active.
 */
const exitFullscreenIfActive = () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  }
}

/**
 * Stops the QR scanner by unmounting QrcodeStream.
 */
const stopScan = () => {
  exitFullscreenIfActive()

  fullscreen.value = false
  scanMode.value = false
}

/**
 * Toggles browser fullscreen mode.
 *
 * Fullscreen is not available everywhere (for example iPhone Safari), so failures
 * are reported to the user instead of being thrown.
 */
const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    if (!scannerWrapper.value?.requestFullscreen) {
      qrError.value = FULLSCREEN_UNSUPPORTED_MESSAGE
      return
    }

    await scannerWrapper.value.requestFullscreen()
  } catch {
    qrError.value = FULLSCREEN_UNSUPPORTED_MESSAGE
  }
}

/**
 * Handles fullscreen changes caused by browser controls or ESC.
 */
const onFullscreenChange = () => {
  fullscreen.value = Boolean(document.fullscreenElement)
}

/**
 * Claims the SmartPack identified by the detected QR code.
 */
const claimSmartPack = async () => {
  if (submitting.value || !hasDetectedCode.value) {
    return
  }

  try {
    submitting.value = true

    const message = await claim(deviceUid.value, {
      imei: imei.value,
    })

    $notifySuccess(message)
    emit('claimed')
  } catch (e) {
    $notifyError(e instanceof Error ? e.message : String(e))
  } finally {
    submitting.value = false
  }
}

/**
 * Closes the claim modal.
 */
const close = () => {
  if (scanMode.value) {
    stopScan()
  }

  emit('close')
}

onBeforeUnmount(exitFullscreenIfActive)
</script>

<style scoped>
.fullscreen {
  position: fixed;
  z-index: 1000;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: black;
}
</style>
