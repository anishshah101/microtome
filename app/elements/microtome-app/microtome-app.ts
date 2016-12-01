enum ActivePage {
  PRINT_VOLUME, SLICE_PREVIEW, SETTINGS
}

enum SettingsTab {
  PRINTER, JOB, ABOUT
}

enum TransformMode {
  NONE, MOVE, ROTATE, SCALE
}


/**
* Main app controller class that manages the behaviors of all sub components
*
* Supports slicing, etc.
*
*/
@component('microtome-app')
class MicrotomeApp extends polymer.Base {

  // Convenience imports
  _LEAD_MM = microtome.printer.ThreadUnits.LEAD_MM;
  _LEAD_IN = microtome.printer.ThreadUnits.LEAD_IN;
  _INCH = microtome.units.LengthUnit.INCH;
  _µM = microtome.units.LengthUnit.MICRON;
  _MM = microtome.units.LengthUnit.MILLIMETER;
  _CM = microtome.units.LengthUnit.CENTIMETER;
  private _convertLengthUnit = microtome.units.convertLengthUnit

  //-----------------------------------------------------------------
  // Properties
  //-----------------------------------------------------------------

  @property({ readOnly: false, notify: true, type: Object, value: () => new microtome.three_d.PrinterScene })
  public scene: microtome.three_d.PrinterScene;

  @property({ readOnly: false, notify: true, type: Object })
  public printJobConfig: microtome.printer.PrintJobConfig = {
    name: "Job 1",
    decription: "",
    stepDistance: 1.24,
    stepsPerLayer: 20,
    settleTime: 1000,
    layerExposureTime: 500,
    blankTime: 1000,
    retractDistance: 5,
    zOffset: 2,
    raftThickness: 1.5
  }

  @property({ readOnly: false, notify: true, type: Object })
  public printerConfig: microtome.printer.PrinterConfig = {
    name: 'Homebrew DLP',
    description: 'Homebrew DLP printer built from servo city parts and using micro projector',
    lastModified: null,
    volume: {
      width: 36,
      depth: 24,
      height: 50
    },
    zStage: {
      threadMeasure: 0.05,
      threadUnits: microtome.printer.ThreadUnits.LEAD_IN,
      stepsPerRev: 1024,
      microsteps: 1
    },
    projector: {
      xRes: 1280,
      yRes: 1024,
    }
  };

  @property({ notify: true })
  public hideSlicePreview: boolean = true;

  @property({ readOnly: false, notify: false })
  public sliceAt: number = 0;

  @property({ readOnly: false, notify: true })
  public minLayerThickness: number;

  @property({ type: Number })
  public activePage: ActivePage = ActivePage.PRINT_VOLUME;

  @property({ type: Number, readOnly: false, notify: true })
  public activeSettingsTab: SettingsTab = SettingsTab.PRINTER;

  // @property({ type: Object, readOnly: false, notify: true })
  // public selectedModel: THREE.Mesh = null;

  @property({ notify: true, readOnly: false, type: Object })
  public pickedMesh: THREE.Mesh = null;
  //-----------------------------------------------------------------
  // Computed Properties
  //-----------------------------------------------------------------

  @computed({ type: Number })
  minLayerThicknessMicrons(minLayerThickness: number) {
    return (this._convertLengthUnit(minLayerThickness, this._MM, this._µM)).toFixed(2);
  }

  @computed({ type: Boolean })
  public hideInfo(activePage: ActivePage): boolean {
    return activePage == ActivePage.SETTINGS
  }

  //---------------------------------------------------------------
  // Change observers
  //---------------------------------------------------------------

  @observe("printerConfig.volume.width,printerConfig.volume.depth,printerConfig.volume.height")
  printVolumeChanged(newWidth: number, newDepth: number, newHeight: number) {
    this.scene.printVolume.resize(newWidth, newDepth, newHeight);
  }

  @observe("printerConfig.zStage.threadMeasure,printerConfig.zStage.threadUnits,printerConfig.zStage.stepsPerRev,printerConfig.zStage.microsteps")
  zstageParamsChanged(newThreadMeasure: number, newThreadUnits: microtome.printer.ThreadUnits, newStepsPerRev: number, newMicrosteps: number) {
    if (newThreadUnits == this._LEAD_IN) {
      this.minLayerThickness = this._convertLengthUnit(newThreadMeasure / (newMicrosteps * newStepsPerRev), this._INCH, this._MM);
    } else if (newThreadUnits == this._LEAD_MM) {
      this.minLayerThickness = newThreadMeasure / (newMicrosteps * newStepsPerRev);
    }
    // window.console.log(this.minLayerThickness);
  }

  @observe("pickedMesh")
  pickedMeshChanged(newMesh: THREE.Mesh, oldMesh: THREE.Mesh) {

  }

  //------------------------------------------------------------
  // Lifecycle methods
  //------------------------------------------------------------

  public ready() {
    // var geom = new THREE.BoxGeometry(10, 10, 10);
    console.log(this['is'], 'ready!')
  }

  public attached() {
    // var geom = new THREE.SphereGeometry(10);
    // var mesh = new THREE.Mesh(geom, microtome.three_d.CoreMaterialsFactory.objectMaterial);
    // mesh.rotateX(Math.PI / 2);
    // mesh.position.z = 10 + this.printJobConfig.zOffset;
    // this.scene.printObjects.push(mesh);

    this.$['sa-pv'].sharedElements = { 'hero': this.$['slice-preview-button'] }
    this.$['sa-pv'].animationConfig = {
      'entry': [
        {
          name: 'fade-in-animation',
          node: this.$['sa-pv'],
        },
      ],
      'exit': [
        {
          name: 'hero-animation',
          id: 'hero',
          fromPage: this.$['sa-pv']
        },
        {
          name: 'fade-out-animation',
          node: this.$['sa-pv'],
        }
      ]
    }

    this.$['sa-sp'].sharedElements = { 'hero': this.$['slice-preview'] }
    this.$['sa-sp'].animationConfig = {
      'entry': [
        {
          name: 'hero-animation',
          id: 'hero',
          toPage: this.$['sa-sp']
        },
        {
          name: 'fade-in-animation',
          node: this.$['sa-sp'],
        }
      ],
      'exit': [
        {
          name: 'fade-out-animation',
          node: this.$['sa-sp'],
        }
      ]
    }
    this.$['sa-pc'].sharedElements = { 'hero': this.$['settings-toolbar'] }
    this.$['sa-pc'].animationConfig = {
      'entry': [
        {
          name: 'hero-animation',
          id: 'hero',
          toPage: this.$['sa-pc']
        },
        {
          name: 'fade-in-animation',
          node: this.$['sa-pc'],
        }
      ],
      'exit': [
        {
          name: 'fade-out-animation',
          node: this.$['sa-pc'],
        }
      ]
    }
    window.addEventListener("wheel", this._handleWindowMouseScroll)
  }

  public sliceUp(numSlices: number = 1) {
    if (isNaN(numSlices)) {
      numSlices = 1
    }
    this.sliceAt += this.minLayerThickness * numSlices;
    if (this.sliceAt > this.scene.printVolume.height) this.sliceAt = this.scene.printVolume.height;
    // window.console.log(this.sliceAt);
  }

  public sliceDown(numSlices: number = 1) {
    if (isNaN(numSlices)) {
      numSlices = 1
    }
    this.sliceAt -= this.minLayerThickness * numSlices;
    if (this.sliceAt < 0) this.sliceAt = 0;
    // window.console.log(this.sliceAt);
  }

  public sliceStart() {
    this.sliceAt = 0;
    window.console.log(this.sliceAt);
  }

  public sliceEnd() {
    this.sliceAt = this.scene.printVolume.height;
    window.console.log(this.sliceAt);
  }

  public sliceToFile() {
    let jobCfg: microtome.slicer_job.SliceJobConfig = {
      layers: {
        thicknessMicrons: 50,
        exposureTimeSecs: 5
      },
      raft: {
        thicknessMM: 1,
        layers: {
          thicknessMicrons: 150,
          exposureTimeSecs: 10
        }
      },
      retractMM: 3
    }

    microtome.slicer_job.HeadlessToZipSlicer.execute(
      this.scene,
      this.printerConfig,
      jobCfg,
      false).then((content) => saveAs(content, "slices.zip"));

  }

  //-----------------------------------------------------------------
  // Event listeners
  //-----------------------------------------------------------------

  public toggleSlicePreview(e: Event) {
    this.hideSlicePreview = !this.hideSlicePreview
    if (this.hideSlicePreview) {
      this.activePage = ActivePage.PRINT_VOLUME;
    } else {
      this.$['sa-pv'].sharedElements['hero'] = this.$['slice-preview-button']
      this.activePage = ActivePage.SLICE_PREVIEW;
    }
  }

  _handleWindowMouseScroll = (e: WheelEvent) => {
    if (this.hideSlicePreview) return;
    var numSlices = 1;
    if (e.shiftKey) {
      if (e.altKey) {
        numSlices = 100;
      } else {
        numSlices = 10;
      }
    }
    // Shiftkey changes axis of scroll in chrome...
    if (e.deltaY > 0 || e.deltaX > 0) {
      this.sliceDown(numSlices);
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      this.sliceUp(numSlices);
    }
  }

  public openSettings(e: Event) {
    this.$['sa-pv'].sharedElements['hero'] = this.$['settings-button']
    this.activePage = ActivePage.SETTINGS;
  }

  public fixTabs() {
    if (this.activePage == ActivePage.SETTINGS) {
      this.$['config-tabs'].notifyResize();
    }
  }

  public closeSettings(e: Event) {
    this.activePage = ActivePage.PRINT_VOLUME;
  }

  onPrintVolumeViewContextMenu(e: MouseEvent): boolean {
    e.preventDefault();
    this.$['pv-fab-radial'].open(e.clientX, e.clientY);
    return false;
  }

  showFileChooser(e: MouseEvent): boolean {
    this._resetFileChooser();
    this.$['file-chooser']['opened'] = true;
    return false;
  }

  private _stlLoader = new THREE.STLLoader();

  private _resetFileChooser() {
    this.$['mesh-file']['inputElement'].files = null;
    this.$['mesh-file']['inputElement'].value = null;
  }

  loadMesh(e: MouseEvent) {
    // Can't bind value of paper-input in dialog. Bug?
    var fl: FileList = this.$['mesh-file']['inputElement'].files;
    var furl: string = URL.createObjectURL(fl[0]);
    this._stlLoader.load(furl, (geom: THREE.Geometry | THREE.BufferGeometry) => {
      var g = geom instanceof THREE.Geometry ? geom : new THREE.Geometry().fromBufferGeometry(<THREE.BufferGeometry>geom);
      var mesh = new microtome.three_d.PrintMesh(g, microtome.three_d.CoreMaterialsFactory.objectMaterial);
      g.computeBoundingBox();
      var toOriginVector = new THREE.Vector3(0, 0, 0).sub(g.boundingBox.center());
      g.translate(toOriginVector.x, toOriginVector.y, toOriginVector.z);
      g.translate(0, 0, (g.boundingBox.max.z - g.boundingBox.min.z) / 2);
      g.computeBoundingBox();
      this.scene.printObjects.push(mesh);
      this.notifyPath("scene.printObjects", this.scene.printObjects.slice());
    });
  }

  onRotateClick(e: MouseEvent) {

  }

  onMoveClick(e: MouseEvent) {

  }

  onScaleClick(e: MouseEvent) {

  }

  onAddModelClick(e: MouseEvent) {

  }

  onDeleteModelClick(e: MouseEvent) {
    if (this.pickedMesh != null) {
      // var idx = this.scene.printObjects.indexOf(this.pickedMesh);
      // this.scene.printObjects.splice(idx,1);
      // // this.scene.remove(this.pickedMesh);
      this.pickedMesh.geometry.dispose();
      this.pickedMesh.material.dispose();
      this.scene.removePrintObject(this.pickedMesh);
      this.pickedMesh = null;
      this.notifyPath("scene.printObjects", this.scene.printObjects.slice());
    }
  }
}

MicrotomeApp.register();
