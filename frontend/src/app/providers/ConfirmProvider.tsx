import { AlertDialog, Button } from '@heroui/react'
import { useEffect, useState, type ReactNode } from 'react'
import { ConfirmContext } from './confirm-context'
import { createConfirmController, type ConfirmOptions } from './confirmController'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null)
  const [controller] = useState(() => createConfirmController(setDialog))
  useEffect(() => () => controller.dispose(), [controller])

  return (
    <ConfirmContext.Provider value={controller.request}>
      {children}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={dialog != null}
          isKeyboardDismissDisabled={false}
          onOpenChange={(open) => {
            if (!open) controller.settle(false)
          }}
        >
          <AlertDialog.Container size="sm" placement="center">
            <AlertDialog.Dialog aria-describedby="confirmation-description">
              <AlertDialog.CloseTrigger aria-label="取消操作" />
              <AlertDialog.Header>
                <AlertDialog.Icon status={dialog?.danger ? 'danger' : 'warning'} />
                <AlertDialog.Heading>{dialog?.title}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p
                  id="confirmation-description"
                  className="break-words text-sm leading-6 text-muted"
                >
                  {dialog?.description}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="secondary" autoFocus onPress={() => controller.settle(false)}>
                  取消
                </Button>
                <Button
                  variant={dialog?.danger ? 'danger' : 'primary'}
                  onPress={() => controller.settle(true)}
                >
                  {dialog?.confirmText ?? '继续'}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
