# Curl Angle Planner

A lightweight browser app for analyzing a curling photo or video frame and estimating the shot angle from a marked release point to a target point.

## What this MVP does

- Uploads an image or video directly in the browser
- Supports phone camera capture for on-ice use
- Lets you scrub video to the right release frame
- Lets you mark the release point and intended target
- Draws the shot line on top of the media
- Calculates the angle relative to the chosen ice direction

## How to run it

Because the project is dependency-free, you can open [index.html](/Users/riofujita/Desktop/Jasmine/index.html) directly in a browser.

For camera mode on a phone, open the app from `https` or `localhost`, because mobile browsers usually block camera access on insecure pages.

If you prefer a local server, from this folder run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Product note

This first version is geometric, not physics-based. It does **not** yet model:

- stone curl over distance
- release weight / speed
- guard or takeout collision paths
- automatic pose or rink detection from video

Those would be natural next steps once you decide whether you want this to be:

1. a coaching tool
2. a broadcast analysis tool
3. a consumer training app with AI-assisted detection
