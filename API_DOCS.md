# API Documentation

The Image Host provides a Developer API for programmatically uploading images using your generated API Key.

## Base URL
`https://image-host.<your-username>.workers.dev`

## Authentication
All API requests must include your Developer API Key in the `Authorization` header as a Bearer token.
You can generate your API Key from the Developer API section in your dashboard.

```http
Authorization: Bearer ih_xxxxxxxxxxxxxxxx
```

---

## Endpoints

### 1. Upload an Image
Uploads a single image to the cloud. Maximum file size is 2MB.

**Endpoint:** `POST /api/v1/upload`  
**Content-Type:** `multipart/form-data`

#### Request Body (Form-Data)
- `file` (required): The image file you want to upload.

#### Example Request (cURL)
```bash
curl -X POST https://image-host.<username>.workers.dev/api/v1/upload \
  -H "Authorization: Bearer ih_your_api_key_here" \
  -F "file=@/path/to/your/image.png"
```

#### Example Response (Success - 200 OK)
```json
{
  "message": "Image uploaded successfully via API",
  "image": {
    "id": "abc123xy",
    "url": "https://image-host-xyz.vercel.app/i/abc123xy.png",
    "direct_r2_url": "https://pub-xxxxxx.r2.dev/user_xxxx/abc123xy.png"
  }
}
```

#### Example Response (Error - 401 Unauthorized)
```json
{
  "error": "Invalid API Key"
}
```

#### Example Response (Error - 400 Bad Request)
```json
{
  "error": "File size exceeds 2MB limit"
}
```
