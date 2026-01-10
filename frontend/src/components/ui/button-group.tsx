import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const buttonGroupVariants = cva(
  'flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*=\'w-\'])]:w-fit [&>input]:flex-1 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md has-[>[data-slot=button-group]]:gap-2',
  {
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
      rounded: {
        md: '',
        lg: '',
        xl: '',
        '2xl': '',
        '3xl': '',
        full: '',
      },
    },
    compoundVariants: [
      // Horizontal orientation
      { orientation: 'horizontal', rounded: 'md', class: '[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md' },
      { orientation: 'horizontal', rounded: 'lg', class: '[&>*:first-child]:rounded-l-lg [&>*:last-child]:rounded-r-lg' },
      { orientation: 'horizontal', rounded: 'xl', class: '[&>*:first-child]:rounded-l-xl [&>*:last-child]:rounded-r-xl' },
      { orientation: 'horizontal', rounded: '2xl', class: '[&>*:first-child]:rounded-l-2xl [&>*:last-child]:rounded-r-2xl' },
      { orientation: 'horizontal', rounded: '3xl', class: '[&>*:first-child]:rounded-l-3xl [&>*:last-child]:rounded-r-3xl' },
      { orientation: 'horizontal', rounded: 'full', class: '[&>*:first-child]:rounded-l-full [&>*:last-child]:rounded-r-full' },
      // Vertical orientation
      { orientation: 'vertical', rounded: 'md', class: '[&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md' },
      { orientation: 'vertical', rounded: 'lg', class: '[&>*:first-child]:rounded-t-lg [&>*:last-child]:rounded-b-lg' },
      { orientation: 'vertical', rounded: 'xl', class: '[&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl' },
      { orientation: 'vertical', rounded: '2xl', class: '[&>*:first-child]:rounded-t-2xl [&>*:last-child]:rounded-b-2xl' },
      { orientation: 'vertical', rounded: '3xl', class: '[&>*:first-child]:rounded-t-3xl [&>*:last-child]:rounded-b-3xl' },
      { orientation: 'vertical', rounded: 'full', class: '[&>*:first-child]:rounded-t-full [&>*:last-child]:rounded-b-full' },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      rounded: 'md',
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  rounded,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={ orientation }
      className={ cn(buttonGroupVariants({ orientation, rounded }), className) }
      { ...props }
    />
  )
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      className={ cn(
        'bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4',
        className
      ) }
      { ...props }
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={ orientation }
      className={ cn(
        'bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto',
        className
      ) }
      { ...props }
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
