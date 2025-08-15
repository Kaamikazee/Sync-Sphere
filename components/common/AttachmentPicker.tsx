"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import getCroppedImg from "@/lib/getCroppedImg"; // your helper that returns a Blob
import { createPortal } from "react-dom";
import { Paperclip } from "lucide-react";

export type Pending = {
  id: string;
  // `file` is the file that will actually be uploaded. `originalFile` keeps the unmodified original so user can revert.
  file: File;
  originalFile?: File;
  preview?: string | null;
  orientation?: "portrait" | "landscape" | "square";
};

export type AttachmentPickerRef = {
  uploadAll: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient: any
  ) => Promise<
    Array<{ id: string; storagePath: string; mime?: string; size?: number }>
  >;
  clear: () => void;
};

type Props = {
  groupId: string;
  chatId?: string;
  onChange?: (files: Pending[]) => void;
  // optional: if you want a fixed aspect ratio, set e.g. 1 for square. Leave undefined for free crop.
  cropAspect?: number | undefined;
};

export const AttachmentPicker = forwardRef<AttachmentPickerRef, Props>(
  ({ groupId, chatId, onChange, cropAspect }, ref) => {
    const [files, setFiles] = useState<Pending[]>([]);
    const filesRef = useRef<Pending[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null); // cropping state
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [cropFileId, setCropFileId] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [rotation, setRotation] = useState<number>(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    // aspect controls: undefined = free crop. aspectOption is for UI highlighting.
    const [aspect, setAspect] = useState<number | undefined>(
      cropAspect ?? undefined
    );
    const [aspectOption, setAspectOption] = useState<string>(
      cropAspect ? "preset" : "free"
    );

    const containerRef = useRef<HTMLDivElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // this tracks orientation for the modal when opened
    const [modalImageOrientation, setModalImageOrientation] = useState<
      "portrait" | "landscape" | "square"
    >("landscape");

    // keep filesRef in sync
    useEffect(() => {
      filesRef.current = files;
      onChange?.(files);
    }, [files, onChange]);

    // unmount cleanup: revoke any remaining previews
    useEffect(() => {
      return () => {
        for (const f of filesRef.current) {
          if (f.preview) URL.revokeObjectURL(f.preview);
        }
      };
    }, []);

    // NEW: don't auto-open crop UI. Instead, add files as-is and let user click "Edit" on any image to crop.
    const onSelectFiles = async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const selected = ev.target.files;
      if (!selected) return;

      const incoming: Pending[] = [];

      for (const f of Array.from(selected)) {
        const id = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const preview = f.type.startsWith("image/")
          ? URL.createObjectURL(f)
          : undefined;

        incoming.push({
          id,
          file: f,
          originalFile: f,
          preview,
          orientation: undefined,
        });
      }

      // append all selected without opening the cropper
      setFiles((prev) => {
        const next = [...prev, ...incoming];
        // start async orientation detection for each incoming with preview
        incoming.forEach((p) => {
          if (!p.preview) return;
          const img = new Image();
          img.src = p.preview!;
          img.onload = () => {
            const orientation =
              img.naturalHeight > img.naturalWidth
                ? "portrait"
                : img.naturalWidth > img.naturalHeight
                ? "landscape"
                : "square";
            setFiles((current) =>
              current.map((c) => (c.id === p.id ? { ...c, orientation } : c))
            );
          };
          img.onerror = () => {
            // fallback keep undefined
          };
        });
        return next;
      });

      if (inputRef.current) inputRef.current.value = "";
    };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCropComplete = useCallback((croppedArea: any, pixels: any) => {
      setCroppedAreaPixels(pixels);
    }, []);

    // close modal helper to centralize cleanup
    const closeModal = () => {
      setCropSrc(null);
      setCropFileId(null);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
      // reset aspect to original prop if provided
      setAspect(cropAspect ?? undefined);
      setAspectOption(cropAspect ? "preset" : "free");
    };

    const applyCrop = async () => {
      if (!cropFileId) {
        closeModal();
        return;
      }
      const idx = filesRef.current.findIndex((p) => p.id === cropFileId);
      const pending = filesRef.current[idx];
      if (!pending) {
        closeModal();
        return;
      }

      if (!croppedAreaPixels) {
        // nothing selected; close and keep original
        closeModal();
        return;
      }

      try {
        // get blob from helper, pass rotation so helper can rotate crop
        const blob: Blob = await getCroppedImg(
          pending.preview!,
          croppedAreaPixels,
          rotation
        );

        // convert blob -> File (so types + compression accept it)
        const blobAsFile = new File(
          [blob],
          pending.originalFile?.name ?? pending.file.name,
          {
            type: blob.type || pending.file.type,
            lastModified: Date.now(),
          }
        );

        // compress (imageCompression typically returns a File)
        const compressedFile: File = (await imageCompression(blobAsFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        })) as File;

        const newPreview = URL.createObjectURL(compressedFile);

        // update state safely via function using latest filesRef
        setFiles((prev) => {
          const copy = [...prev];
          const localIdx = copy.findIndex((p) => p.id === pending.id);
          if (localIdx === -1) {
            // append if missing
            copy.push({
              id: pending.id,
              file: compressedFile,
              originalFile: pending.originalFile,
              preview: newPreview,
              orientation: pending.orientation,
            });
          } else {
            // revoke old preview
            if (copy[localIdx].preview)
              URL.revokeObjectURL(copy[localIdx].preview!);
            copy[localIdx] = {
              id: pending.id,
              file: compressedFile,
              originalFile: pending.originalFile,
              preview: newPreview,
              orientation: pending.orientation,
            };
          }
          return copy;
        });
      } catch (err) {
        console.error("crop error", err);
        // keep the original file if cropping fails
      } finally {
        closeModal();
      }
    };

    const removeAt = (index: number) => {
      setFiles((prev) => {
        const copy = [...prev];
        const item = copy[index];
        if (item?.preview) URL.revokeObjectURL(item.preview);
        copy.splice(index, 1);
        return copy;
      });
    };

    // NEW: open editor for a specific pending file
    const openEditorFor = (id: string) => {
      const p = filesRef.current.find((f) => f.id === id);
      if (!p) return;
      if (!p.preview) return; // can't crop without a preview image

      // determine orientation (fallback to loading image if not known)
      if (p.orientation) {
        setModalImageOrientation(p.orientation);
        setCropSrc(p.preview);
        setCropFileId(id);
        setRotation(0);
        // prefer 'original' aspect option so the crop area reflects image orientation
        setAspectOption("original");
        setAspect(undefined);
        return;
      }

      const img = new Image();
      img.src = p.preview;
      img.onload = () => {
        const orientation =
          img.naturalHeight > img.naturalWidth
            ? "portrait"
            : img.naturalWidth > img.naturalHeight
            ? "landscape"
            : "square";
        setFiles((cur) =>
          cur.map((c) => (c.id === p.id ? { ...c, orientation } : c))
        );
        setModalImageOrientation(orientation);
        setCropSrc(p.preview!);
        setCropFileId(id);
        setRotation(0);
        setAspectOption("original");
        setAspect(undefined);
      };
      img.onerror = () => {
        setModalImageOrientation("landscape");
        setCropSrc(p.preview!);
        setCropFileId(id);
        setRotation(0);
        setAspectOption("original");
        setAspect(undefined);
      };
    };

    // NEW: revert to original file (if user cropped but wants original back)
    const revertToOriginal = (id: string) => {
      setFiles((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((p) => p.id === id);
        if (idx === -1) return copy;
        const p = copy[idx];
        if (!p.originalFile) return copy;
        // revoke current preview if any
        if (p.preview) URL.revokeObjectURL(p.preview);
        const originalPreview = p.originalFile
          ? URL.createObjectURL(p.originalFile)
          : undefined;
        copy[idx] = {
          id: p.id,
          file: p.originalFile,
          originalFile: p.originalFile,
          preview: originalPreview,
          orientation: p.orientation,
        };
        return copy;
      });
    };

    // recompute fit zoom when cropSrc or container size changes
    const computeAndSetFitZoom = useCallback((img: HTMLImageElement | null) => {
      const container = containerRef.current;
      if (!container || !img) return;
      const rect = container.getBoundingClientRect();
      const containerW = rect.width || 1;
      const containerH = rect.height || 1;

      // how much we need to scale the image so it fits the container
      const fit = Math.min(
        containerW / img.naturalWidth,
        containerH / img.naturalHeight
      );

      // Avoid upscaling small images: default zoom should be at most 1 (original size).
      // If the image is larger than the container (fit < 1) we use fit so the entire image fits by default.
      const initialZoom = Math.min(1, fit);

      // Minimum allowed zoom: don't let it be 0 — keep a sane lower bound
      const minAllowedZoom = Math.max(0.1, Math.min(1, fit));

      setMinZoom(minAllowedZoom);
      setZoom(initialZoom);
      setCrop({ x: 0, y: 0 });
    }, []);

    // handler called by react-easy-crop when the image is loaded into the cropper
    const onMediaLoaded = useCallback(
      (img: HTMLImageElement) => {
        computeAndSetFitZoom(img);
      },
      [computeAndSetFitZoom]
    );

    // Setup ResizeObserver so we recompute fit zoom if the container resizes
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      if (typeof ResizeObserver === "undefined") return;

      resizeObserverRef.current = new ResizeObserver(() => {
        // if there's a cropSrc, create an Image element to compute sizing
        if (!cropSrc) return;
        const img = new Image();
        img.src = cropSrc;
        img.onload = () => computeAndSetFitZoom(img);
      });
      resizeObserverRef.current.observe(container);

      return () => {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
      };
    }, [cropSrc, computeAndSetFitZoom]);

    // modal helpers: focus trap, escape, body scroll lock
    useEffect(() => {
      if (!cropSrc) return;

      // store current focused element to restore later
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;

      // lock body scroll
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          closeModal();
          return;
        }
        if (ev.key === "Tab") {
          // focus trap simple implementation
          const root = modalRef.current;
          if (!root) return;
          const focusable = Array.from(
            root.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null);

          if (focusable.length === 0) {
            ev.preventDefault();
            return;
          }

          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          if (ev.shiftKey) {
            // backward
            if (idx === -1 || idx === 0) {
              focusable[focusable.length - 1].focus();
              ev.preventDefault();
            } else {
              focusable[idx - 1].focus();
              ev.preventDefault();
            }
          } else {
            // forward
            if (idx === -1 || idx === focusable.length - 1) {
              focusable[0].focus();
              ev.preventDefault();
            } else {
              focusable[idx + 1].focus();
              ev.preventDefault();
            }
          }
        }
      };

      document.addEventListener("keydown", onKeyDown);

      // focus the modal container (or first focusable child)
      setTimeout(() => {
        const root = modalRef.current;
        if (!root) return;
        const first = root.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled])'
        );
        (first ?? root).focus();
      }, 0);

      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = previousOverflow;
        // restore focus
        try {
          previouslyFocusedRef.current?.focus();
        } catch {
          // ignore
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cropSrc]);

    // expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        // uploads current filesRef.current using presign endpoint & supabase client you pass
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uploadAll: async (supabaseClient: any) => {
          const currentFiles = filesRef.current;
          if (!currentFiles || currentFiles.length === 0) return [];

          // Build metadata for presign
          const meta = currentFiles.map((f) => ({
            name: f.file.name,
            mime: f.file.type,
            size: f.file.size,
          }));

          // robust token getter for many supabase-js versions
          let accessToken = "";
          try {
            // v2: auth.getSession()
            if (typeof supabaseClient.auth?.getSession === "function") {
              const sess = await supabaseClient.auth.getSession();
              accessToken = sess?.data?.session?.access_token ?? "";
            } else if (typeof supabaseClient.auth?.getUser === "function") {
              // older; getUser may exist but not session
              const userRes = await supabaseClient.auth.getUser();
              // it doesn't return token; try session if available
              const sess2 = await supabaseClient.auth.getSession?.();
              accessToken = sess2?.data?.session?.access_token ?? "";
              if (!accessToken && userRes?.data?.user) {
                accessToken = "";
              }
            } else if (typeof supabaseClient.auth?.session === "function") {
              // legacy API: auth.session()
              const legacy = supabaseClient.auth.session();
              accessToken = legacy?.access_token ?? "";
            } else {
              console.warn(
                "No known supabase auth methods on client; cannot get token automatically."
              );
            }
          } catch (err) {
            console.warn("Error reading supabase session/token", err);
          }

          // make request — include Authorization if token found and include cookies as fallback
          const presignRes = await fetch("/api/attachments/presign", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
            credentials: "include",
            body: JSON.stringify({ files: meta, groupId, chatId }),
          });

          let presignJson = null;
          try {
            presignJson = await presignRes.json();
          } catch (e) {
            console.error("presign: failed to parse JSON response", e);
          }

          if (!presignRes.ok) {
            throw new Error(
              presignJson?.error ?? `presign failed status ${presignRes.status}`
            );
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const presigned = presignJson.files as Array<any>;

          const uploaded: Array<{
            id: string;
            storagePath: string;
            mime?: string;
            size?: number;
          }> = [];

          // iterate and upload. We rely on the presigned array ordering to match client files ordering.
          for (let i = 0; i < presigned.length; i++) {
            const p = presigned[i];
            const fileObj = currentFiles[i]?.file;
            if (!fileObj) {
              console.warn("Missing file for presign index", i);
              continue;
            }

            try {
              if (
                supabaseClient?.storage?.from &&
                typeof supabaseClient.storage.from("").uploadToSignedUrl ===
                  "function"
              ) {
                const bucket =
                  process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET ||
                  "attachments";
                const { error } = await supabaseClient.storage
                  .from(bucket)
                  .uploadToSignedUrl(p.storagePath, p.uploadToken, fileObj);
                if (error) throw error;
              } else if (p.uploadUrl) {
                await fetch(p.uploadUrl, {
                  method: "PUT",
                  headers: { "Content-Type": fileObj.type },
                  body: fileObj,
                });
              } else {
                throw new Error(
                  "No supported upload method available on supabase client and no uploadUrl provided by presign."
                );
              }

              uploaded.push({
                id: p.id,
                storagePath: p.storagePath,
                mime: p.mime,
                size: p.size,
              });
            } catch (err) {
              console.error("upload error for file", fileObj.name, err);
              throw err;
            }
          }

          return uploaded;
        },

        clear: () => {
          setFiles((prev) => {
            prev.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
            return [];
          });
        },
      }),
      [groupId, chatId]
    );

    // compute modal container style depending on orientation (Telegram-like feel)
    const computeContainerStyle = () => {
      if (modalImageOrientation === "portrait") {
        return {
          width: "min(420px, 86vw)",
          height: "86vh",
        } as React.CSSProperties;
      }
      // landscape or square
      return {
        width: "min(90vw, 1200px)",
        height: "min(64vh, 72vw)",
      } as React.CSSProperties;
    };

    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onSelectFiles}
          accept="image/*,application/pdf,application/zip"
          style={{ display: "none" }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1 rounded bg-white/10"
          >
            <Paperclip color="white" />
          </button>
          <div className="flex gap-2">
            {files.map((f, i) => (
              <div key={f.id} className="w-20">
                <div className="relative w-20 h-20 rounded overflow-hidden bg-gray-100 border flex items-center justify-center">
                  {/* show oriented thumbnails: portrait images get taller preview look */}
                  {f.preview ? (
                    <img
                      src={f.preview}
                      className={`w-full h-full ${
                        f.orientation === "portrait"
                          ? "object-contain"
                          : "object-contain"
                      }`}
                      alt="attachment preview"
                    />
                  ) : (
                    <div className="p-2 text-xs">
                      {f.file.name.slice(0, 12)}
                    </div>
                  )}

                  <div className="absolute top-0 right-0 flex flex-col gap-1 p-1">
                    <button
                      onClick={() => removeAt(i)}
                      className="text-white bg-black/40 rounded px-1"
                    >
                      ×
                    </button>
                    {/* Edit only if image preview exists */}
                    {f.preview && (
                      <button
                        onClick={() => openEditorFor(f.id)}
                        className="text-white bg-black/40 rounded px-1"
                      >
                        Edit
                      </button>
                    )}
                    {/* show Revert when we have an originalFile and it's different from current file */}
                    {f.originalFile && f.file !== f.originalFile && (
                      <button
                        onClick={() => revertToOriginal(f.id)}
                        className="text-white bg-black/40 rounded px-1"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs mt-1 truncate">{f.file.name}</div>
              </div>
            ))}
          </div>
        </div>

        {typeof document !== "undefined" && cropSrc
          ? createPortal(
              <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
              >
                <div
                  className="bg-white p-3 rounded-lg shadow-lg flex flex-col gap-3"
                  style={computeContainerStyle()}
                >
                  <div
                    ref={containerRef}
                    style={{ position: "relative", flex: 1, minHeight: 120 }}
                  >
                    <Cropper
                      image={cropSrc}
                      crop={crop}
                      zoom={zoom}
                      rotation={rotation}
                      minZoom={minZoom}
                      aspect={aspect ?? undefined}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    //   @ts-expect-error - kladfm
                      onMediaLoaded={onMediaLoaded}
                    />
                  </div>

                  {/* toolbar: rotate, zoom hint, aspect selectors */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                        title="Rotate"
                      >
                        Rotate
                      </button>
                    </div>

                    <div className="flex gap-2 items-center">
                      {["free", "original", "1:1", "3:2", "4:3", "16:9"].map(
                        (opt) => {
                          const label =
                            opt === "free"
                              ? "Free"
                              : opt === "original"
                              ? "Original"
                              : opt;
                          const isActive =
                            aspectOption === opt ||
                            (aspectOption === "preset" &&
                              opt === "original" &&
                              cropAspect != null);
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                setAspectOption(opt);
                                if (opt === "free") {
                                  setAspect(undefined);
                                } else if (opt === "original") {
                                  const container = containerRef.current;
                                  if (container) {
                                    const rect =
                                      container.getBoundingClientRect();
                                    setAspect(rect.width / rect.height);
                                  } else {
                                    setAspect(undefined);
                                  }
                                } else if (opt === "1:1") setAspect(1);
                                else if (opt === "3:2") setAspect(3 / 2);
                                else if (opt === "4:3") setAspect(4 / 3);
                                else if (opt === "16:9") setAspect(16 / 9);
                              }}
                              className={`px-2 py-1 rounded text-sm ${
                                isActive
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-200"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1"
                      onClick={() => {
                        closeModal();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white"
                      onClick={applyCrop}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    );
  }
);

AttachmentPicker.displayName = "AttachmentPicker";

export default AttachmentPicker;
