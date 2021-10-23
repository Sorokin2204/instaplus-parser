# system libraries
import os
import sys
import urllib

# recaptcha libraries
import pydub
import speech_recognition as sr

if __name__ == "__main__":
    path_to_mp3 = os.path.normpath(os.path.join(os.getcwd(), sys.argv[1]+".mp3"))
    path_to_wav = os.path.normpath(os.path.join(os.getcwd(), sys.argv[1]+".wav"))

# download the mp3 audio file from the source
    urllib.request.urlretrieve(sys.argv[2], path_to_mp3)

    # load downloaded mp3 audio file as .wav
    try:
        sound = pydub.AudioSegment.from_mp3(path_to_mp3)
        sound.export(path_to_wav, format="wav")
        sample_audio = sr.AudioFile(path_to_wav)
    except Exception:
        sys.exit("[ERR] Please run program as administrator or download ffmpeg manually, "
                 "https://blog.gregzaal.com/how-to-install-ffmpeg-on-windows/")
    # translate audio to text with google voice recognition
    r = sr.Recognizer()
    with sample_audio as source:
        audio = r.record(source)
    key = r.recognize_google(audio)
    print(f"{key}")