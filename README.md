# Exam Cheating Detection

## Project Overview
This project aims to detect cheating during examinations using advanced AI and Machine Learning techniques. By implementing state-of-the-art computer vision and facial recognition algorithms, the system can effectively monitor exam environments and ensure academic integrity.

## Features
- **Real-Time Monitoring:** Continuous analysis of students during exams to detect suspicious behavior.
- **Facial Recognition:** Utilizes DeepFace for accurate identification of individuals.
- **Object Detection:** Implements YOLOv8 for recognizing unauthorized items like mobile phones or notes.
- **Pose Estimation:** Uses MediaPipe to analyze students' postures and movements.
- **Video Processing:** Employs OpenCV for video capture and processing to enhance detection capabilities.

## Technology Stack
- **Languages:** Python
- **Frameworks & Libraries:**
  - **YOLOv8:** For real-time object detection.
  - **DeepFace:** For facial recognition tasks.
  - **MediaPipe:** For analyzing human posture and movement.
  - **OpenCV:** For image and video processing.
- **Database:** [Your preferred database, e.g., SQLite, PostgreSQL]

## Setup Instructions
### Backend Setup
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/aliasif767/exam-cheating-detection.git
   cd exam-cheating-detection
   ```
2. **Create a Virtual Environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. **Install Required Packages:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the Backend:**
   ```bash
   python app.py  # Adjust according to your main application file
   ```

### Frontend Setup
1. **Navigate to Frontend Directory:**
   ```bash
   cd frontend  # Adjust the path accordingly
   ```
2. **Install Frontend Dependencies:**
   ```bash
   npm install  # Or yarn install depending on your setup
   ```
3. **Start the Frontend:**
   ```bash
   npm start  # Or yarn start
   ```

## Contribution
Feel free to fork the repository and submit pull requests for any improvements or features you'd like to see!

## License
[Specify your License, e.g., MIT License]  

---  
For any issues or feature requests, please open an issue on GitHub.