"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
    totalSeconds: number
}

export const TimerContainer = ({totalSeconds}: Props) => {

    function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }
    return (
        <Card className="mt-6 w-full sm:w-auto sm:min-w-[40rem] py-10 bg-cyan-400">
              <CardHeader className="justify-center items-center">
                <CardTitle className="text-7xl sm:text-9xl">
                    {formatHMS(totalSeconds)}
                </CardTitle>
                <CardDescription className="text-lg sm:text-2xl mt-6 text-center">
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center mt-4 gap-4">
                
              </CardContent>
            </Card>
    )
}