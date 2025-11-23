"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
    setErrors({})
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".mkv"],
    },
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      return newFiles
    })
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index.toString()]
      return newErrors
    })
  }

  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("filename", file.name)

    try {
      const xhr = new XMLHttpRequest()

      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setUploadProgress((prev) => ({
              ...prev,
              [index]: percentComplete,
            }))
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            setUploadedFiles((prev) => new Set([...prev, index.toString()]))
            setUploadProgress((prev) => {
              const newProgress = { ...prev }
              delete newProgress[index]
              return newProgress
            })
            resolve()
          } else {
            const error = JSON.parse(xhr.responseText)?.error || "Erro ao fazer upload"
            setErrors((prev) => ({
              ...prev,
              [index]: error,
            }))
            reject(new Error(error))
          }
        })

        xhr.addEventListener("error", () => {
          setErrors((prev) => ({
            ...prev,
            [index]: "Erro de conexão",
          }))
          reject(new Error("Erro de conexão"))
        })

        xhr.open("POST", "/api/upload")
        xhr.send(formData)
      })
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [index]: error instanceof Error ? error.message : "Erro desconhecido",
      }))
      throw error
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setErrors({})
    setUploadedFiles(new Set())

    try {
      let successCount = 0
      let errorCount = 0

      // Processa em fila sequencial (um por vez, do primeiro ao último)
      for (let index = 0; index < files.length; index++) {
        try {
          await uploadFile(files[index], index)
          successCount++
        } catch (error) {
          errorCount++
          // Continua para o próximo arquivo mesmo se houver erro
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      if (successCount > 0) {
        toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} arquivo(s) falharam no upload`)
      }

      if (errorCount === 0) {
        setTimeout(() => {
          setFiles([])
          setUploadedFiles(new Set())
          setUploadProgress({})
          setErrors({})
          onOpenChange(false)
        }, 2000)
      }
    } catch (error) {
      console.error("Erro no upload:", error)
      toast.error("Erro ao fazer upload dos arquivos")
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Músicas para Cloudflare R2</DialogTitle>
          <DialogDescription>
            Arraste e solte arquivos de vídeo aqui ou clique para selecionar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-gray-300 dark:border-gray-700 hover:border-cyan-400/50"
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-cyan-400 font-medium">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Arraste arquivos de vídeo aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Formatos suportados: MP4, AVI, MOV, MKV
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Arquivos selecionados ({files.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => {
                  const isUploaded = uploadedFiles.has(index.toString())
                  const isUploading = uploadProgress[index] !== undefined
                  const hasError = errors[index]
                  const progress = uploadProgress[index] || 0

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        {isUploading && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{progress}%</p>
                          </div>
                        )}
                        {hasError && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors[index]}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isUploaded && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {!isUploaded && !isUploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {files.length > 0 && `(${files.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

