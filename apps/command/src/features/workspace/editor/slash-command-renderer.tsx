import { ReactRenderer } from "@tiptap/react"
import tippy from "tippy.js"
import { SlashCommandList } from "./slash-command-list"
import type { Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "@/lib/editor/commands"
import type { SlashCommandListRef } from "./slash-command-list"
import type { Instance, Props as TippyProps } from "tippy.js"

type SlashCommandRendererProps = {
  editor: Editor
  clientRect?: (() => DOMRect | null) | null
  items: Array<EditorCommand>
  command: (item: EditorCommand) => void
  range: Range
}

const getFallbackClientRect = () => new DOMRect(0, 0, 0, 0)

const getClientRect = (props: SlashCommandRendererProps) => {
  return props.clientRect?.() ?? getFallbackClientRect()
}

export const renderSlashCommandItems = () => {
  let component: ReactRenderer<SlashCommandListRef> | null = null
  let popup: Array<Instance<TippyProps>> | null = null

  return {
    onStart: (props: SlashCommandRendererProps) => {
      if (!props.clientRect) {
        return
      }

      component = new ReactRenderer(SlashCommandList, {
        props,
        editor: props.editor,
      })

      popup = tippy("body", {
        getReferenceClientRect: () => getClientRect(props),
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      })
    },

    onUpdate: (props: SlashCommandRendererProps) => {
      component?.updateProps(props)

      if (!props.clientRect) {
        return
      }

      popup?.[0]?.setProps({
        getReferenceClientRect: () => getClientRect(props),
      })
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide()
        return true
      }

      return component?.ref?.onKeyDown(props) ?? false
    },

    onExit: () => {
      popup?.[0]?.destroy()
      component?.destroy()

      popup = null
      component = null
    },
  }
}
