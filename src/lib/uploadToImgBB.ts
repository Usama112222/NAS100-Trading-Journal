export async function uploadToImgBB(file: File): Promise<string> {
  const apiKey = "3127fd71eee8270d1a187e6d90aebdd3"

  const formData = new FormData()
  formData.append("image", file)

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    {
      method: "POST",
      body: formData,
    }
  )

  const data = await res.json()

  if (!data.success) {
    throw new Error("Image upload failed")
  }

  return data.data.url as string
}