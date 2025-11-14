import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "./utils"
import { Button } from "@smartlogbook/ui/button"
import { formatDate } from "@smartlogbook/lib/date-format"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
}: DatePickerProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground",
        className
      )}
      disabled={disabled}
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'date'
        input.value = value ? value.toISOString().split('T')[0] : ''
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement
          if (target.value) {
            onChange?.(new Date(target.value))
          } else {
            onChange?.(undefined)
          }
        }
        input.click()
      }}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {value ? formatDate(value) : placeholder}
    </Button>
  )
}
