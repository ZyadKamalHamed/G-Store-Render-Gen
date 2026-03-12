import json
import requests
import time

api_key = "<YOUR_API_KEY>"
authorization = "Bearer %s" % api_key

headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": authorization
}

# Get a presigned URL for uploading an image
url = "https://cloud.leonardo.ai/api/rest/v1/init-image"

payload = {"extension": "jpg"}

response = requests.post(url, json=payload, headers=headers)

print("Get a presigned URL for uploading an image: %s" % response.status_code)

# Upload image via presigned URL
fields = json.loads(response.json()['uploadInitImage']['fields'])

url = response.json()['uploadInitImage']['url']

# For getting the image later
image_id = response.json()['uploadInitImage']['id']

image_file_path = "/project/workspace/test.jpg"
files = {'file': open(image_file_path, 'rb')}

response = requests.post(url, data=fields, files=files)  # Header is not needed

print("Upload image via presigned URL: %s" % response.status_code)

# Generate image with an image reference
url = "https://cloud.leonardo.ai/api/rest/v2/generations"

payload = {
    "model": "gemini-image-2",
    "parameters": {
        "width": 1584,
        "height": 672,
        "prompt": "A koala on a green sofa",
        "quantity": 1,
        "seed": 12345,
        "guidances": {
            "image_reference": [
                {
                    "image": {
                        "id": "%s" % image_id,
                        "type": "UPLOADED"
										},
										"strength": "MID"
                }
            ]
        },
        "style_ids": [
            "111dc692-d470-4eec-b791-3475abac4c46"
        ],
        "prompt_enhance": "OFF"
    },
    "public": False
}

response = requests.post(url, json=payload, headers=headers)

print("Generate image with an image reference: %s" % response.status_code)

# Get the generated image
generation_id = response.json()['generate']['generationId']

url = "https://cloud.leonardo.ai/api/rest/v1/generations/%s" % generation_id

time.sleep(30)

response = requests.get(url, headers=headers)

print(response.text)
