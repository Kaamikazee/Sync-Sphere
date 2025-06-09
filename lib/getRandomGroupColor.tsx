import { GroupIconColor } from "@prisma/client";

export const colors = Object.values(GroupIconColor)
export const getRandomGroupColor = () => {
    const colors: string[] = Object.values(GroupIconColor)
    const randomIndex = Math.floor(Math.random() * colors.length)

    return colors[randomIndex] as GroupIconColor;
}