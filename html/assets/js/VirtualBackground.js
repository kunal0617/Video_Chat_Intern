/*import { generateGoogleMeetSegmentationDefaultConfig, generateDefaultGoogleMeetSegmentationParams, GoogleMeetSegmentationWorkerManager, GoogleMeetSegmentationSmoothingType } from '@dannadori/googlemeet-segmentation-worker-js';
export class VirtualBackground {
    constructor() {
        this.canvasFront = document.createElement('canvas');
        this.canvasFrontResized = document.createElement("canvas");
        this.canvasBackground = document.createElement("canvas");
        this.inputCanvas = document.createElement("canvas");
        this.personCanvas = document.createElement("canvas");
        this.personMaskCanvas = document.createElement("canvas");
        this.lightWrapCanvas = document.createElement("canvas");
        this.config = {
            frontPositionX: 0,
            frontPositionY: 0,
            frontWidth: 1,
            frontHeight: 1,
            width: -1,
            height: -1,
            type: "GoogleMeet",
            backgroundMode: "Image",
            backgroundImage: null,
            backgroundColor: "#000000"
        };
        this.targetCanvas = document.createElement('canvas');
        this.targetCanvasCtx = this.targetCanvas.getContext('2d');
        this.canvasVideoFrameBuffer = new ChimeSDK.CanvasVideoFrameBuffer(this.targetCanvas);
        this.googlemeetModelReady = false;
        this.googlemeetConfig = (() => {
            const c = generateGoogleMeetSegmentationDefaultConfig();
            c.processOnLocal = true;
            return c;
        })();
        this.googlemeetParams = (() => {
            const p = generateDefaultGoogleMeetSegmentationParams();
            p.processHeight = 128;
            p.processWidth = 128;
            p.smoothingR = 1;
            p.smoothingS = 1;
            p.jbfHeight = 256;
            p.jbfWidth = 256;
            p.lightWrapping = true;
            p.smoothingType = GoogleMeetSegmentationSmoothingType.JS;
            return p;
        })();
        this.googlemeetManager = (() => {
            console.log("Google");
            const m = new GoogleMeetSegmentationWorkerManager();
            m.init(this.googlemeetConfig).then(() => {
                this.googlemeetModelReady = true;
            });
            return m;
        })();
        this.googleMeetLightWrappingEnable = true;
        this.convert_googlemeet = (foreground, background, segmentation, conf) => {
            if (conf.width <= 0 || conf.height <= 0) {
                conf.width = foreground.width > background.width ? foreground.width : background.width;
                conf.height = foreground.height > background.height ? foreground.height : background.height;
            }
            this.targetCanvas.width = conf.width;
            this.targetCanvas.height = conf.height;
            this.targetCanvas.getContext("2d").drawImage(background, 0, 0, conf.width, conf.height);
            const prediction = segmentation;
            console.log(prediction);
            this.personMaskCanvas.width = prediction[0].length;
            this.personMaskCanvas.height = prediction.length;
            const maskCtx = this.personMaskCanvas.getContext("2d");
            maskCtx.clearRect(0, 0, this.personMaskCanvas.width, this.personMaskCanvas.height);
            const imageData = maskCtx.getImageData(0, 0, this.personMaskCanvas.width, this.personMaskCanvas.height);
            const data = imageData.data;
            for (let rowIndex = 0; rowIndex < this.personMaskCanvas.height; rowIndex++) {
                for (let colIndex = 0; colIndex < this.personMaskCanvas.width; colIndex++) {
                    const pix_offset = ((rowIndex * this.personMaskCanvas.width) + colIndex) * 4;
                    if (prediction[rowIndex][colIndex] >= 128) {
                        data[pix_offset + 0] = 0;
                        data[pix_offset + 1] = 0;
                        data[pix_offset + 2] = 0;
                        data[pix_offset + 3] = 0;
                    }
                    else {
                        data[pix_offset + 0] = 255;
                        data[pix_offset + 1] = 255;
                        data[pix_offset + 2] = 255;
                        data[pix_offset + 3] = 255;
                    }
                }
            }
            const imageDataTransparent = new ImageData(data, this.personMaskCanvas.width, this.personMaskCanvas.height);
            maskCtx.putImageData(imageDataTransparent, 0, 0);
            this.personMaskCanvas.width = this.targetCanvas.width;
            this.personMaskCanvas.height = this.targetCanvas.height;
            const personCtx = this.personCanvas.getContext("2d");
            personCtx.clearRect(0, 0, this.personCanvas.width, this.personCanvas.height);
            personCtx.drawImage(this.personMaskCanvas, 0, 0, this.personCanvas.width, this.personCanvas.height);
            personCtx.globalCompositeOperation = "source-atop";
            personCtx.drawImage(foreground, 0, 0, this.personCanvas.width, this.personCanvas.height);
            this.personCanvas.getContext("2d").globalCompositeOperation = "source-over";
            if (this.googleMeetLightWrappingEnable) {
                this.lightWrapCanvas.width = prediction[0].length;
                this.lightWrapCanvas.height = prediction.length;
                const lightWrapImageData = this.lightWrapCanvas.getContext("2d").getImageData(0, 0, this.lightWrapCanvas.width, this.lightWrapCanvas.height);
                const lightWrapdata = lightWrapImageData.data;
                for (let rowIndex = 0; rowIndex < this.lightWrapCanvas.height; rowIndex++) {
                    for (let colIndex = 0; colIndex < this.lightWrapCanvas.width; colIndex++) {
                        const pix_offset = ((rowIndex * this.lightWrapCanvas.width) + colIndex) * 4;
                        if (prediction[rowIndex][colIndex] > 140) {
                            lightWrapdata[pix_offset + 0] = 0;
                            lightWrapdata[pix_offset + 1] = 0;
                            lightWrapdata[pix_offset + 2] = 0;
                            lightWrapdata[pix_offset + 3] = 0;
                        }
                        else {
                            lightWrapdata[pix_offset + 0] = 255;
                            lightWrapdata[pix_offset + 1] = 255;
                            lightWrapdata[pix_offset + 2] = 255;
                            lightWrapdata[pix_offset + 3] = 255;
                        }
                    }
                }
                const lightWrapimageDataTransparent = new ImageData(lightWrapdata, this.lightWrapCanvas.width, this.lightWrapCanvas.height);
                this.lightWrapCanvas.getContext("2d").putImageData(lightWrapimageDataTransparent, 0, 0);
            }
            const targetCtx = this.targetCanvas.getContext("2d");
            targetCtx.drawImage(this.canvasBackground, 0, 0, this.targetCanvas.width, this.targetCanvas.height);
            if (this.googleMeetLightWrappingEnable) {
                targetCtx.filter = 'blur(2px)';
                targetCtx.drawImage(this.lightWrapCanvas, 0, 0, this.targetCanvas.width, this.targetCanvas.height);
                targetCtx.filter = 'none';
            }
            this.targetCanvas.getContext("2d").drawImage(this.personCanvas, 0, 0, this.targetCanvas.width, this.targetCanvas.height);
        };
        console.log("NewVBGP");
        const bg = new Image();
        bg.src = "./72415f8c-3e06-40fc-b5a6-32fd76c7b567-shutterstock-1270572721.jpg";
        bg.onload = () => {
            this.canvasBackground.getContext("2d").drawImage(bg, 0, 0, this.canvasBackground.width, this.canvasBackground.height);
        };
    }
    async destroy() {
        this.targetCanvasCtx = null;
        this.canvasVideoFrameBuffer.destroy();
        return;
    }
    async process(buffers) {
        if (buffers.length === 0) {
            return Promise.resolve(buffers);
        }
        //@ts-ignore
        const canvas = buffers[0].asCanvasElement();
        const frameWidth = canvas.width;
        const frameHeight = canvas.height;
        if (frameWidth === 0 || frameHeight === 0) {
            return Promise.resolve(buffers);
        }
        for (const f of buffers) {
            try {
                //@ts-ignore
                const canvas = f.asCanvasElement;
                //let result: any
                if (this.googlemeetModelReady) {
                    const result = await this.googlemeetManager.predict(canvas, this.googlemeetParams);
                    this.convert_googlemeet(canvas, this.canvasBackground, result, this.config);
                }
            }
            catch (err) {
                console.log("Exception: ", err);
            }
        }
        buffers[0] = this.canvasVideoFrameBuffer;
        return Promise.resolve(buffers);
    }
}*/