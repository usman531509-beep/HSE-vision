# 02 — Models and Datasets

## Goal
Use existing pretrained computer-vision models and datasets for the first prototype. Do not start by training a model from scratch.

## Places to explore

### Roboflow
Website: https://roboflow.com/

Useful for:
- Exploring PPE datasets and community projects.
- Reviewing available classes and example annotations.
- Testing models where an inference endpoint is provided.
- Preparing and annotating a project-specific dataset if the generic model is not good enough.

Starting references:
- PPE use cases: https://universe.roboflow.com/use-cases/ppe-detection
- PPE datasets: https://universe.roboflow.com/browse/construction/ppe

### Ultralytics YOLO
Website and documentation: https://docs.ultralytics.com/

Useful for:
- Running object detection locally in Python.
- Detecting supported classes using pretrained weights.
- Training/fine-tuning on a project-specific PPE dataset.
- Tracking objects across video frames.

References:
- Construction PPE dataset guide: https://docs.ultralytics.com/datasets/detect/construction-ppe/
- Tracking: https://docs.ultralytics.com/modes/track/

### NVIDIA DeepStream — later option
Documentation: https://docs.nvidia.com/metropolis/deepstream/dev-guide/

Consider this later if the project moves to multiple live camera streams and a suitable NVIDIA GPU deployment. It is not required for the first recorded-video prototype.

## Recommended selection process
1. List the exact classes required: person, helmet, safety vest, gloves and any other agreed PPE.
2. Inspect each candidate dataset's classes, image quality and licence.
3. Test at least one candidate model on a short sample from the target factory environment.
4. Review false positives and false negatives manually.
5. Keep the model only if it performs acceptably on the actual camera angles, lighting, distance and PPE types.
6. If it is not good enough, collect and label representative project footage, then fine-tune a model.

## Licensing check
Before using a model or dataset in a company product, review its current licence and commercial-use terms. In particular, check the applicable Ultralytics licensing requirements (AGPL-3.0 and any commercial/Enterprise terms) with the project/company before choosing it for a proprietary deployment.

## Important
A model advertised as “PPE detection” may not support every PPE type or every factory environment. Model class names, dataset quality, licence and measured performance must be checked rather than assumed.
