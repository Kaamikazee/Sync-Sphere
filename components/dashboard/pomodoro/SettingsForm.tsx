"use client";

import { PomodoroSettings, PomodoroSoundEffect } from "@prisma/client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  PomodoroSettingsSchema,
  pomodoroSettingsSchema,
} from "@/schemas/pomoSettingsSchema";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useCallback, useMemo, useState } from "react";

import { Howl } from "howler";
import { pathsToSoundEffects } from "@/lib/utils";
import { Clock, Play, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loadingState";

interface Props {
  pomodoroSettings: PomodoroSettings;
}

export const SettingsForm = ({
  pomodoroSettings: {
    id,
    longBreakDuration,
    longBreakInterval,
    rounds,
    shortBreakDuration,
    soundEffect,
    soundEffectVolume,
    workDuration,
  },
}: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const form = useForm<PomodoroSettingsSchema>({
    resolver: zodResolver(pomodoroSettingsSchema),
    defaultValues: {
      longBreakDuration,
      longBreakInterval,
      rounds,
      shortBreakDuration,
      soundEffect,
      soundEffectVolume: soundEffectVolume * 100,
      workDuration,
    },
  });

  const router = useRouter();

  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (formData: PomodoroSettingsSchema) => {
      await axios.post("/api/pomodoro/update", formData);
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: async () => {
      toast.success("Pomodoro Settings updated successfully");
    },
    mutationKey: ["updatePomodoroSettings"],
  });

  const { mutate: resetSettings, isPending: isResetting } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/pomodoro/update", {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 2,
        rounds: 3,
        soundEffect: PomodoroSoundEffect.BELL,
        soundEffectVolume: 50,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: async () => {
      toast.success("Pomodoro Settings resetted successfully");

      form.reset({
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 2,
        rounds: 3,
        soundEffect: PomodoroSoundEffect.BELL,
        soundEffectVolume: 50,
      });
      router.refresh();
    },
    mutationKey: ["resetPomodoroSettings"],
  });

  const isDefaultValue = useMemo(() => {
    return (
      workDuration === 25 &&
      shortBreakDuration === 5 &&
      longBreakDuration === 15 &&
      longBreakInterval === 2 &&
      rounds === 3 &&
      soundEffect === PomodoroSoundEffect.BELL &&
      soundEffectVolume === 50
    );
  }, [
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    longBreakInterval,
    rounds,
    soundEffect,
    soundEffectVolume,
  ]);

  const playSoundEffectHandler = useCallback(
    (soundEffect: PomodoroSoundEffect) => {
      const currentPath = pathsToSoundEffects[soundEffect];
      const sound = new Howl({
        src: currentPath,
        html5: true,
        onend: () => {
          setIsPlaying(false);
        },
        volume: form.getValues("soundEffectVolume") / 100,
      });

      sound.play();
      setIsPlaying(true);
    },
    [form]
  );

  const onSubmit = (data: PomodoroSettingsSchema) => {
    updateSettings(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6 w-full">
          <div className="flex gap-2 items-center text-muted-foreground">
            <Clock />
            <p>Timer</p>
          </div>
          <FormField
            control={form.control}
            name="workDuration"
            render={({ field: { value, onChange } }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Work duration: {value} minutes</FormLabel>
                <FormControl>
                  <Slider
                    min={15}
                    max={60}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>
                  Set the duration of your work.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortBreakDuration"
            render={({ field: { value, onChange } }) => (
              <FormItem>
                <FormLabel>Short break duration: {value} minutes</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={15}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>Set the duration of your short break</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longBreakDuration"
            render={({ field: { value, onChange } }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Long break duration: {value} minutes</FormLabel>
                <FormControl>
                  <Slider
                    min={10}
                    max={45}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>
                  Set the duration of your long break.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rounds"
            render={({ field: { value, onChange } }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Number of rounds: {value}</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>
                  Set how many rounds complete a full session (one round ends after the long break time elapses).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="longBreakInterval"
            render={({ field: { value, onChange } }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Interval between long breaks: {value}</FormLabel>
                <FormControl>
                  <Slider
                    min={2}
                    max={10}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>
                  The larger the value, the longer one round lasts (greater interval between long breaks)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 items-center text-muted-foreground">
            <Volume2 />
            <p>Sound</p>
          </div>

          <FormField
            control={form.control}
            name="soundEffect"
            render={({ field: { value, onChange } }) => (
              <FormItem className="sm:max-w-sm">
                <FormLabel>Notification Sound</FormLabel>
                <div className="flex gap-2 items-center">
                    <Select onValueChange={onChange} value={value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select sound" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value={PomodoroSoundEffect.ANALOG}>
                                Analog
                            </SelectItem>
                            <SelectItem value={PomodoroSoundEffect.BELL}>
                                Bell
                            </SelectItem>
                            <SelectItem value={PomodoroSoundEffect.BIRD}>
                                Bird
                            </SelectItem>
                            <SelectItem value={PomodoroSoundEffect.CHURCH_BELL}>
                                Church Bell
                            </SelectItem>
                            <SelectItem value={PomodoroSoundEffect.DIGITAL}>
                                Digital
                            </SelectItem>
                            <SelectItem value={PomodoroSoundEffect.FANCY}>
                                Fancy
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                    disabled={isPlaying}
                    onClick={() => {
                        playSoundEffectHandler(
                            value as PomodoroSoundEffect
                        )
                    }}
                    type="button"
                    variant={"ghost"}
                    size={"icon"}
                    >
                        <Play />
                    </Button>
                </div>
                <FormDescription>
                 Choose the sound to play when the time is up.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="soundEffectVolume"
            render={({ field: { value, onChange } }) => (
              <FormItem className="sm:max-w-sm">
                <FormLabel>Notification sound volume: {value}%</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    defaultValue={[value]}
                    onValueChange={(vals) => {
                      onChange(vals[0]);
                    }}
                    value={[value]}
                  />
                </FormControl>
                <FormDescription>
                  To mute the notification, set the volume to 0%
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
             <Button
            disabled={isUpdating || isDefaultValue}
            type="button"
            onClick={() => {
              resetSettings();
            }}
            className="w-full sm:w-auto"
          >
            {isResetting ? (
              <LoadingState loadingText={"Resetting"} />
            ) : (
              "Reset"
            )}
          </Button>
          <Button
            disabled={isResetting}
            className="text-white w-full sm:w-auto"
            type="submit"
          >
            {isUpdating ? (
              <LoadingState loadingText={"Saving"} />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
