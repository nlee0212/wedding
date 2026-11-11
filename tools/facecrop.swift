// 사용: swift facecrop.swift <입력폴더> <출력폴더> <한 변 px>
// 각 사진에서 얼굴(Vision)을 찾아 얼굴들이 가운데 오도록 정사각형으로 자른다.
// 얼굴이 없으면 가로 가운데, 세로 위쪽 40% 지점을 중심으로 자른다.
import Foundation
import CoreImage
import Vision
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let side = CGFloat(Double(args[3]) ?? 640)
let ctx = CIContext()
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension.lowercased() == "jpg" }.sorted { $0.lastPathComponent < $1.lastPathComponent }

for url in files {
  // EXIF 회전을 적용한 실제 보이는 방향 그대로
  guard let img = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else { continue }
  let ext = img.extent
  let W = ext.width, H = ext.height
  var cx = W / 2, cy = H * 0.6   // CoreImage 좌표는 아래가 0 → 위쪽 40% 지점
  var nFaces = 0
  let req = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(ciImage: img, options: [:]).perform([req])
  if let faces = req.results, !faces.isEmpty {
    nFaces = faces.count
    // 얼굴들을 모두 감싸는 상자의 중심 (크기로 가중)
    var minX = CGFloat.greatestFiniteMagnitude, minY = minX, maxX = -minX, maxY = -minX
    for f in faces {
      let b = f.boundingBox
      minX = min(minX, b.minX); maxX = max(maxX, b.maxX)
      minY = min(minY, b.minY); maxY = max(maxY, b.maxY)
    }
    cx = (minX + maxX) / 2 * W
    // 얼굴을 정중앙보다 살짝 위(1/3 지점)에 두면 몸까지 자연스럽게 보임
    let faceCY = (minY + maxY) / 2 * H
    let s0 = min(W, H)
    cy = faceCY - s0 * 0.12
  } else {
    // 얼굴이 너무 작거나 가려진 원경 사진 → 사람 몸 전체를 찾아 그 중심으로
    let body = VNDetectHumanRectanglesRequest()
    body.upperBodyOnly = false
    try? VNImageRequestHandler(ciImage: img, options: [:]).perform([body])
    if let people = body.results, !people.isEmpty {
      nFaces = -people.count // 음수 = 몸으로 찾음
      var minX = CGFloat.greatestFiniteMagnitude, minY = minX, maxX = -minX, maxY = -minX
      for p in people {
        let b = p.boundingBox
        minX = min(minX, b.minX); maxX = max(maxX, b.maxX)
        minY = min(minY, b.minY); maxY = max(maxY, b.maxY)
      }
      cx = (minX + maxX) / 2 * W
      // 사람을 화면 세로 가운데보다 살짝 아래에 (머리 위 여백을 조금 남김)
      cy = (minY + maxY) / 2 * H + min(W, H) * 0.05
    }
  }
  let s = min(W, H)
  var x0 = cx - s / 2, y0 = cy - s / 2
  x0 = max(ext.minX, min(x0, ext.maxX - s))
  y0 = max(ext.minY, min(y0, ext.maxY - s))
  let crop = img.cropped(to: CGRect(x: x0, y: y0, width: s, height: s))
    .transformed(by: CGAffineTransform(translationX: -x0, y: -y0))
  let scale = side / s
  let out = crop.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  let dst = outDir.appendingPathComponent(url.lastPathComponent)
  try ctx.writeJPEGRepresentation(of: out, to: dst, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
                                  options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.8])
  print("\(url.lastPathComponent)\tfaces=\(nFaces)")
}
