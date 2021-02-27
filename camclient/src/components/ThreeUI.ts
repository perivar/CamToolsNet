import * as THREE from 'three';

interface ISpriteValue {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  size?: number;
}

export const makeSprite = (rendererType: string, vals: ISpriteValue): THREE.Object3D => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let metrics = null;
  const textHeight = 14;
  let textWidth = 0;

  const txt = vals.text;

  if (context) {
    context.font = `normal ${textHeight}px Arial`;
    metrics = context.measureText(txt);
    textWidth = metrics.width;

    // if we don't increase the canvas, we get blurry text
    canvas.style.width = `${textWidth}px`;
    canvas.style.height = `${textHeight}px`;
    canvas.width = textWidth * 20;
    canvas.height = textHeight * 20;
    context.scale(20, 20);
    context.font = `normal ${textHeight}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = vals.color;
    context.fillText(txt, textWidth / 2, textHeight / 2);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6
    });

    const textObject = new THREE.Object3D();
    textObject.position.x = vals.x;
    textObject.position.y = vals.y;
    textObject.position.z = vals.z;

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(textWidth, textHeight, 1);

    textObject.add(sprite);
    return textObject;
  }
  return new THREE.Object3D();
};
