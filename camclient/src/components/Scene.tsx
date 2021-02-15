import React from 'react';

const Scene: React.FC = () => (
  <mesh>
    <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
    <meshNormalMaterial attach="material" />
  </mesh>
);

export default Scene;
