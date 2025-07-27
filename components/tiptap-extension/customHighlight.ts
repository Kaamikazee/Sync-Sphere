// extensions/CustomHighlight.ts
import { Highlight } from '@tiptap/extension-highlight'

export const CustomHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-highlight-color'),
        renderHTML: attributes => {
          if (!attributes.color) return {}
          return {
            'data-highlight-color': attributes.color,
            style: `background-color: ${attributes.color};`
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
        getAttrs: node => ({
          color: node.getAttribute('data-highlight-color') || node.style?.backgroundColor
        })
      }
    ]
  }
})
