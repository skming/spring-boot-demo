import { Button, Tooltip, toast } from '@heroui/react'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createCopyController, type CopyFeedback } from '../clipboard/copyController'

type CopyButtonProps = {
  value: string
  label?: string
  getText?: () => string
}

export function CopyButton({ value, label = '复制', getText }: CopyButtonProps) {
  const [feedback, setFeedback] = useState<CopyFeedback>({ copying: false, copiedText: null })
  const [controller] = useState(() =>
    createCopyController(
      (text) => navigator.clipboard.writeText(text),
      setFeedback,
      () => toast.danger('复制失败，请手动选择文本'),
    ),
  )
  useEffect(() => () => controller.dispose(), [controller])
  const copied = feedback.copiedText !== null && feedback.copiedText === value
  const description = feedback.copying ? '正在复制' : copied ? '已复制' : label

  return (
    <>
      <Tooltip delay={300}>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={description}
            className={copied ? 'text-success-soft-foreground' : ''}
            isPending={feedback.copying}
            isDisabled={!value || feedback.copying}
            onPress={() => void controller.copy(getText?.() ?? value)}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{description}</Tooltip.Content>
      </Tooltip>
      <span role="status" className="sr-only">
        {copied ? '已复制到剪贴板' : ''}
      </span>
    </>
  )
}
