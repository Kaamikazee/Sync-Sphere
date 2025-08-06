<Card
                    ref={glowRef}
                    className={`relative mt-6 w-full sm:w-auto max-w-full sm:min-w-[40rem] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300 gap-2 py-2 ${
                      isPomodoro && "hidden"
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl z-0"
                      style={{
                        background:
                          "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.35), transparent 50%)",
                      }}
                    />
                    <CardHeader className="justify-center items-center">
                      <CardTitle className="text-7xl sm:text-9xl">
                        {formatHMS(time)}
                      </CardTitle>
                      {/* <CardDescription className="text-lg sm:text-2xl mt-6 text-center"></CardDescription> */}
                    </CardHeader>
                    <CardContent className="flex justify-center items-center min-h-[1rem]">
                      <AnimatePresence>
                        {running && (
                          <motion.div
                            key="stop-button"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Button
                              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl"
                              onClick={triggerStop}
                            >
                              Stop
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>

                    <Link href={"timer/edit"}>
                      <motion.div
                        initial={{ scale: 1 }}
                        whileHover={{
                          textShadow: "0px 0px 8px rgba(79, 70, 229, 0.8)",
                        }}
                        className="flex justify-end sticky bottom-0 right-2 text-purple-200 hover:text-purple-600"
                      >
                        <Pencil className="mr-2" />
                      </motion.div>
                    </Link>
                    {running && <SessionTimerWidget />}
                    <span className="font-mono">
                      <BreakTimerWidget />
                    </span>
                  </Card>