// src/App.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [agenda, setAgenda] = useState("");
  const [actionItems, setActionItems] = useState([{ task: "", assignee: "", dueDate: "" }]);
  const [notes, setNotes] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  // 获取用户的音频权限
  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setAudioChunks([]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        setAudioChunks((prevChunks) => [...prevChunks, e.data]);
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) return;
        
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", audioFile);

        try {
          const response = await axios.post("http://127.0.0.1:8000/transcribe", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          setTranscript((prev) => prev + " " + response.data.transcript);
        } catch (error) {
          console.error("Error transcribing audio", error);
        }
      };

      mediaRecorder.start(10000); // Capture in 10-second chunks for real-time transcription
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { task: "", assignee: "", dueDate: "" }]);
  };

  const updateActionItem = (index, field, value) => {
    const updatedItems = [...actionItems];
    updatedItems[index][field] = value;
    setActionItems(updatedItems);
  };

  const removeActionItem = (index) => {
    const updatedItems = [...actionItems];
    updatedItems.splice(index, 1);
    setActionItems(updatedItems);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateMeetingMinutes = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let minutes = `# ${meetingTitle || "会议纪要"}\n\n`;
    minutes += `**日期时间:** ${date} ${time}\n\n`;
    minutes += `**参会人员:** ${participants}\n\n`;
    
    if (agenda) {
      minutes += `## 会议议程\n${agenda}\n\n`;
    }
    
    minutes += `## 会议记录\n${transcript}\n\n`;
    
    if (actionItems.some(item => item.task)) {
      minutes += `## 行动项\n`;
      actionItems.forEach((item, index) => {
        if (item.task) {
          minutes += `${index + 1}. **${item.task}** - 负责人: ${item.assignee || "未分配"}${item.dueDate ? `, 截止日期: ${item.dueDate}` : ""}\n`;
        }
      });
      minutes += "\n";
    }
    
    if (notes) {
      minutes += `## 附加说明\n${notes}\n`;
    }
    
    return minutes;
  };

  const saveMeetingMinutes = () => {
    const minutes = generateMeetingMinutes();
    const blob = new Blob([minutes], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${meetingTitle || "meeting"}_minutes.md`;
    link.click();
  };

  return (
    <div className="app-container">
      <header>
        <h1>智能会议纪要助手</h1>
      </header>
      
      <main>
        <section className="meeting-info">
          <h2>会议信息</h2>
          <div className="form-group">
            <label>会议标题:</label>
            <input 
              type="text" 
              value={meetingTitle} 
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="输入会议标题"
            />
          </div>
          
          <div className="form-group">
            <label>参会人员:</label>
            <input 
              type="text" 
              value={participants} 
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="输入参会人员，用逗号分隔"
            />
          </div>
          
          <div className="form-group">
            <label>会议议程:</label>
            <textarea 
              value={agenda} 
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="输入会议议程"
              rows="3"
            />
          </div>
        </section>
        
        <section className="recording-section">
          <h2>录音转写</h2>
          <div className="recording-controls">
            <button 
              className={`record-button ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              {isRecording ? "停止录音" : "开始录音"}
            </button>
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span>正在录音 {formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
          
          <div className="transcript-container">
            <h3>实时记录:</h3>
            <div className="transcript-box">
              {transcript || "录音内容将显示在这里..."}
            </div>
          </div>
        </section>
        
        <section className="action-items">
          <h2>行动项</h2>
          {actionItems.map((item, index) => (
            <div key={index} className="action-item">
              <input
                type="text"
                placeholder="任务描述"
                value={item.task}
                onChange={(e) => updateActionItem(index, "task", e.target.value)}
              />
              <input
                type="text"
                placeholder="负责人"
                value={item.assignee}
                onChange={(e) => updateActionItem(index, "assignee", e.target.value)}
              />
              <input
                type="date"
                value={item.dueDate}
                onChange={(e) => updateActionItem(index, "dueDate", e.target.value)}
              />
              <button onClick={() => removeActionItem(index)} className="remove-btn">删除</button>
            </div>
          ))}
          <button onClick={addActionItem} className="add-btn">添加行动项</button>
        </section>
        
        <section className="notes-section">
          <h2>附加说明</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="输入会议的其他说明或备注"
            rows="4"
          />
        </section>
      </main>
      
      <footer>
        <button onClick={saveMeetingMinutes} className="save-btn">
          生成并保存会议纪要
        </button>
      </footer>
    </div>
  );
}

export default App;
