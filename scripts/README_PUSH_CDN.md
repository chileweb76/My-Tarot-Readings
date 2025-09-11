How to publish Rider-Waite images to the CDN repo

1) Prepare a local clone of the CDN repo (create it on GitHub first if necessary):

   git clone git@github.com:chileweb76/mytarotreadings-cdn.git ~/tmp/mytarotreadings-cdn

2) Gather your image source files into a single directory (use the canonical filenames):
   - You can generate the expected filenames by running:

       node scripts/list_rider_filenames.js > expected.txt

   - Place the PNG files with those names into `/path/to/my/rider-images/`

3) Copy files into the CDN repo structure using the helper script:

   node scripts/copy_images_to_cdn_repo.js /path/to/my/rider-images /path/to/local/mytarotreadings-cdn

   This will copy the files into:
   `/path/to/local/mytarotreadings-cdn/client/public/images/rider-waite-tarot/`

4) Commit and push in the CDN repo:

   cd /path/to/local/mytarotreadings-cdn
   # track large files with LFS if needed
   git lfs track "client/public/images/**"
   git add .gitattributes client/public/images/rider-waite-tarot/*
   git commit -m "Add rider-waite tarot images for CDN"
   git push origin main

5) Once pushed, jsDelivr will serve files at:
   https://cdn.jsdelivr.net/gh/chileweb76/mytarotreadings-cdn/client/public/images/rider-waite-tarot/<filename>.png

If you want, I can:
- Create the DB revert script (restoreDeckImagesToLocal) so the DB can temporarily point to `/images/...` instead, OR
- Create a proxy endpoint that streams images from the CDN repo or GitHub raw through your server (this avoids relying on jsDelivr if it's blocked). 

Tell me which next step you'd like (A: prepare commit + instructions to push — done; B: create DB revert script; C: create server proxy endpoint).