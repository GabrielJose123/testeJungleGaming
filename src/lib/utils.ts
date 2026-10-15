import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "tiny",
            "micro",
            "caption",
            "caption-lg",
            "body",
            "body-md",
            "body-lg",
            "lead",
            "title",
            "title-lg",
            "heading",
            "heading-lg",
            "display",
          ],
        },
      ],
      shadow: [{ shadow: ["field", "tabbar"] }],
      rounded: [{ rounded: ["art"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
