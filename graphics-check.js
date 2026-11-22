import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Application } from 'pixi.js';
import { Rive } from '@rive-app/canvas';
import lottie from 'lottie-web';
import { WebGLRenderer } from 'three';
import { WebGPURenderer } from 'three/webgpu';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger, Application, Rive, lottie, WebGLRenderer, WebGPURenderer };
