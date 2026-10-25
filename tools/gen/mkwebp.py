# usage: python3 tools/gen/mkwebp.py OUTDIR   (needs Pillow)
# generate WebP variants with PIL
import sys, io
from PIL import Image
out = sys.argv[1]
import os
icc = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'upstream', 't', 'images', 'ICC_Profile.icc'), 'rb').read()
img = Image.new('RGB', (16, 12))
for x in range(16):
    for y in range(12):
        img.putpixel((x, y), (x * 15, y * 20, (x * y) % 256))
rgba = img.convert('RGBA'); rgba.putpixel((0, 0), (0, 0, 0, 0))
ex = Image.Exif(); ex[0x010f] = 'SynthCam'; ex[0x0110] = 'WebP Model'; ex[0x0112] = 1; ex[0x0132] = '2024:01:02 03:04:05'
exif = ex.tobytes()
xmp = b'<?xpacket begin="\xef\xbb\xbf" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">WebP title</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>'
img.save(f'{out}/lossy.webp', quality=80)
img.save(f'{out}/lossless.webp', lossless=True)
rgba.save(f'{out}/alpha.webp', quality=80)
rgba.save(f'{out}/alpha-lossless.webp', lossless=True)
img.save(f'{out}/exif.webp', quality=80, exif=exif)
img.save(f'{out}/all-meta.webp', quality=80, exif=exif, icc_profile=icc, xmp=xmp)
img.save(f'{out}/icc-lossless.webp', lossless=True, icc_profile=icc)
frames = [img, img.transpose(Image.Transpose.FLIP_LEFT_RIGHT), img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)]
frames[0].save(f'{out}/anim.webp', save_all=True, append_images=frames[1:], duration=100, loop=0, quality=80)
frames[0].save(f'{out}/anim-meta.webp', save_all=True, append_images=frames[1:], duration=[50, 100, 150], loop=3, quality=80, exif=exif, xmp=xmp)
print('ok')
