import { beforeEach, describe, expect, it, vi } from 'vitest'
import Swal from 'sweetalert2'
import type { SweetAlertOptions } from 'sweetalert2'
import { deleteModal, notifyError, notifySuccess } from '../swalNotifier'

const updateSwalBackdrop = vi.fn<() => void>()

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn<typeof Swal.fire>(),
  },
}))

vi.mock('@/stores', () => ({
  useUiStore: vi.fn<() => { updateSwalBackdrop: typeof updateSwalBackdrop }>(() => ({
    updateSwalBackdrop,
  })),
}))

describe('swalNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('notifySuccess', () => {
    it('displays a success toast', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await notifySuccess('Operation successful')

      expect(fire).toHaveBeenCalledWith({
        icon: 'success',
        title: 'Operation successful',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          container: 'z-[1050]',
          popup: 'swal-toast-popup !text-sm',
          timerProgressBar: 'swal-toast-progress',
        },
      })
    })

    it('applies custom configuration overrides', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await notifySuccess('Saved successfully', {
        timer: 6000,
        position: 'bottom-end',
      })

      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Saved successfully',
          timer: 6000,
          position: 'bottom-end',
        }),
      )
    })
  })

  describe('notifyError', () => {
    it('shows an error notification', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await notifyError('Something went wrong')

      expect(updateSwalBackdrop).toHaveBeenCalledWith(true)

      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Error',
          text: 'Something went wrong',
          confirmButtonText: 'Close',
          buttonsStyling: false,
          backdrop: false,
          customClass: {
            container: 'z-[1065]',
            popup: 'swal-tailwind-popup',
            confirmButton: 'swal-tailwind-confirm',
          },
          willClose: expect.any(Function),
        }),
      )

      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('clears the backdrop when the modal closes', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await notifyError('Something went wrong')

      const config = vi.mocked(Swal.fire).mock.calls[0]?.[0] as SweetAlertOptions | undefined

      config?.willClose?.(document.createElement('div'))

      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('clears the backdrop when SweetAlert2 rejects', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockRejectedValue(new Error('SweetAlert2 failed'))

      await expect(notifyError('Something went wrong')).rejects.toThrow('SweetAlert2 failed')

      expect(updateSwalBackdrop).toHaveBeenCalledWith(true)
      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('applies custom configuration overrides', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await notifyError('Request failed', {
        title: 'Request Error',
        confirmButtonText: 'Dismiss',
      })

      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'error',
          title: 'Request Error',
          text: 'Request failed',
          confirmButtonText: 'Dismiss',
        }),
      )
    })
  })

  describe('deleteModal', () => {
    it('shows a destructive action confirmation dialog', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: true,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      const result = await deleteModal('Delete', 'John Doe')

      expect(result).toBe(true)

      expect(updateSwalBackdrop).toHaveBeenCalledWith(true)

      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Confirm Delete',
          text: 'Are you sure you want to Delete John Doe',
          showCancelButton: true,
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          buttonsStyling: false,
          backdrop: false,
          customClass: {
            container: 'z-[1065]',
            popup: 'swal-tailwind-popup',
            confirmButton: 'swal-tailwind-delete',
            cancelButton: 'swal-tailwind-confirm ml-16',
          },
          willClose: expect.any(Function),
        }),
      )

      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('returns false when the action is not confirmed', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      const result = await deleteModal('Delete', 'John Doe')

      expect(result).toBe(false)
    })

    it('returns false when the confirmation is dismissed', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: false,
        isDismissed: true,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      const result = await deleteModal('Suspend', 'Jane Doe')

      expect(result).toBe(false)
    })

    it('clears the backdrop when the modal closes', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: true,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await deleteModal('Delete', 'John Doe')

      const config = vi.mocked(Swal.fire).mock.calls[0]?.[0] as SweetAlertOptions | undefined

      config?.willClose?.(document.createElement('div'))

      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('clears the backdrop when SweetAlert2 rejects', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockRejectedValue(new Error('SweetAlert2 failed'))

      await expect(deleteModal('Delete', 'John Doe')).rejects.toThrow('SweetAlert2 failed')

      expect(updateSwalBackdrop).toHaveBeenCalledWith(true)
      expect(updateSwalBackdrop).toHaveBeenCalledWith(false)
    })

    it('applies custom configuration overrides', async () => {
      const fire = vi.mocked(Swal.fire)

      fire.mockResolvedValue({
        isConfirmed: true,
      } as Awaited<ReturnType<typeof Swal.fire>>)

      await deleteModal('Suspend', 'John Doe', {
        confirmButtonText: 'Yes, suspend',
      })

      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'warning',
          title: 'Confirm Suspend',
          text: 'Are you sure you want to Suspend John Doe',
          confirmButtonText: 'Yes, suspend',
        }),
      )
    })
  })
})
