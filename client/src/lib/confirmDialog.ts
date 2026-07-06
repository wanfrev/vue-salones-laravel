export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const confirmed = window.confirm(message)
    resolve(confirmed)
  })
}

export function useConfirmDialog() {
  const showConfirm = (message: string): Promise<boolean> => {
    return confirmAction(message)
  }

  return { showConfirm }
}
