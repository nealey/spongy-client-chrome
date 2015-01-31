package logfile

import (
	"fmt"
	"os"
	"time"
)

type Logfile struct {
	file *os.File
	name string
	nlines int
	maxlines int
}

func NewLogfile(maxlines int) (*Logfile) {
	return &Logfile{nil, "", 0, maxlines}
}

func (lf *Logfile) Close() {
	if lf.file != nil {
		lf.writeln("EXIT")
		lf.file.Close()
	}
}

func (lf *Logfile) writeln(s string) error {
	_, err := fmt.Fprintf(lf.file, "%d %s\n", time.Now().Unix(), s)
	if err == nil {
		lf.nlines += 1
	}
	return err
}

func (lf *Logfile) rotate() error {
	fn := fmt.Sprintf("%s.log", time.Now().UTC().Format(time.RFC3339))
	newf, err := os.OpenFile(fn, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0666)
	if err != nil {
		return err
	}
	
	if lf.file == nil {
		// Set lf.file just so we can write out NEXTLOG.
		// If this fails, that's okay
		lf.file, _ = os.OpenFile("current", os.O_WRONLY|os.O_APPEND, 0666)
	}
	
	if lf.file != nil {
		// Note location of new log
		logmsg := fmt.Sprintf(". NEXTLOG %s", fn)
		lf.writeln(logmsg)
		
		// All done with the current log
		lf.file.Close()
	}
	
	// Point to new log file
	lf.file = newf
		
	// Record symlink to new log
	os.Remove("current")
	os.Symlink(fn, "current")
	
	logmsg := fmt.Sprintf(". PREVLOG %s", lf.name)
	lf.writeln(logmsg)
	
	lf.name = fn
	
	return nil
}

func (lf *Logfile) Log(s string) error {
	if lf.file == nil {
		lf.rotate()
	}
	
	err := lf.writeln(s)
	if err == nil {
		return err
	}

	if lf.nlines >= lf.maxlines {
		return lf.rotate()
	}
	
	return nil
}