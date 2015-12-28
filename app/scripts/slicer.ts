module microtome.slicer {

  var three_d = microtome.three_d;

  const FAR_Z_PADDING: number = 1.1;

  /// Slicing preview camera nav
  /// Provides a preview of the slicing operation.
  ///
  /// Not intended for actual slicing.
  export class Slicer {
    _oCamera: THREE.OrthographicCamera = null;
    // /// Should be set to a value > max Z build height in mm
    // double targetZ = 100.0;
    // /// Should be 1/2 layer thickness or so
    // /// Default is 0.012 mm or 12 microns
    // double sliceEpsilon = 0.02;
    // CanvasElement _target;

    // 3D
    _sliceMaterialUniforms = {
      'cutoff': { type: 'f', value: 0.0 },
      'epsilon': { type: 'f', value: 0.0 },
      'dTex': { type: 't', value: <THREE.WebGLRenderTarget>null },
      'viewWidth': { type: 'i', value: 0.0 },
      'viewHeight': { type: 'i', value: 0.0 }
    };
    _depthTexRenderTarget: THREE.WebGLRenderTarget = null;
    // List<Object3D> printObjects = [];
    // BoundingBox printVolumeBB;
    // CoreMaterialsFactory _materials = new CoreMaterialsFactory();
    _slicingParamsDirty: boolean = true;
    _slicerMaterial = three_d.CoreMaterialsFactory.sliceMaterial.clone();

    constructor(public scene: THREE.Scene, public renderer: THREE.WebGLRenderer, public printVolumeBB: THREE.Box3, public printObjects: THREE.Object3D[] = [],
      public targetZ: number = 100, public sliceEpsilon: number = 0.012) {
      this._oCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
      this._slicerMaterial.uniforms = this._sliceMaterialUniforms;
    }

    resize() {
      this._slicingParamsDirty = true;
    }

    /// Slice at the given z Height
    sliceAt(z: number) {
      //var zPad = FAR_Z_PADDING / targetZ;
      var sliceZ = (z + FAR_Z_PADDING) / (FAR_Z_PADDING + this.targetZ);
      window.console.log('Slicing at ${z}');
      this._sliceMaterialUniforms['cutoff'].value = sliceZ;
      var width = this.renderer.domElement.width;
      var height = this.renderer.domElement.height;

      if (this._slicingParamsDirty) {
        this._recalcSlicingParams(width, height);
        this._slicingParamsDirty = false;
      }

      if (this._depthTexRenderTarget === null ||
        (width !== this._depthTexRenderTarget.width || height !== this._depthTexRenderTarget.height)) {
        this._depthTexRenderTarget.dispose();

        this._depthTexRenderTarget = new THREE.WebGLRenderTarget(width, height,
          {
            format: THREE.RGBAFormat,
            depthBuffer: true,
            stencilBuffer: false,
            // generateMipMaps: false,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping
          });
        this.scene.overrideMaterial = three_d.CoreMaterialsFactory.depthMaterial;

        this.renderer.render(this.scene, this._oCamera, this._depthTexRenderTarget);
      }

      this.renderer.setClearColor(new THREE.Color(0x000000), 1.0);

      this.scene.overrideMaterial = this._slicerMaterial;
      this._sliceMaterialUniforms['dTex'].value = this._depthTexRenderTarget;
      this._sliceMaterialUniforms['viewWidth'].value = width;
      this._sliceMaterialUniforms['viewHeight'].value = height;
      this.renderer.render(this.scene, this._oCamera);

    }

    clear() {
      var context = this.renderer.domElement.getContext('2d')
      context.fillStyle = 'rgba(0,0,0,1)';
      context.clearRect(0, 0, this.renderer.domElement.width, this.renderer.domElement.height);
    }

    setupSlicerPreview() {
      var maxZ = 0.0;
      this.printObjects.forEach((mesh: THREE.Mesh) => {
        mesh.geometry.computeBoundingBox();
        var meshMaxZ = mesh.localToWorld(mesh.geometry.boundingBox.max).z + mesh.position.z;
        if (meshMaxZ > maxZ) maxZ = meshMaxZ;
      });
      this.targetZ = maxZ;
    }

    teardownSlicerPreview() {
      this.scene.overrideMaterial = null;
    }

    /// Got back to home position and reset slicing
    resetSlicing() {
      this._slicingParamsDirty = true;
    }

    _recalcSlicingParams(newWidth: number, newHeight: number) {
      this._oCamera.position.z = this.targetZ + 1.0;
      this._oCamera.near = 1.0;
      // We add a little padding to the camera far so that if
      // slice geometry is right on the 0 xy plane, when
      // we draw in the colors and textures we don't get ambiguity
      this._oCamera.far = FAR_Z_PADDING + this.targetZ;
      this._oCamera.lookAt(new THREE.Vector3(0, 0, 0));
      this._sliceMaterialUniforms['epsilon'].value = this.sliceEpsilon;

      var widthRatio: number = Math.abs(this.printVolumeBB.max.x - this.printVolumeBB.min.x) / newWidth;
      var heightRatio: number = Math.abs(this.printVolumeBB.max.y - this.printVolumeBB.min.y) / newHeight;
      var scale: number = widthRatio > heightRatio ? widthRatio : heightRatio;
      this._oCamera.right = (scale * newWidth) / 2.0;
      this._oCamera.left = -this._oCamera.right;
      this._oCamera.top = (scale * newHeight) / 2.0;
      this._oCamera.bottom = -this._oCamera.top;
      this._oCamera.updateProjectionMatrix();
    }

    // dispose() {
    // Only deallocates material entirely if this is last used instance.
    // microtomeSharedRenderer.withRenderer((renderer) {
    //   renderer.deallocateMaterial(_materials.sliceMaterial);
    //   renderer.deallocateMaterial(_materials.depthMaterial);
    //   if (_depthTexRenderTarget !== null) renderer.deallocateRenderTarget(_depthTexRenderTarget);
    //   _depthTexRenderTarget = null;
    // });
    // }
  }


}